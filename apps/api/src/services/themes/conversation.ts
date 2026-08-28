/**
 * The builder chat log (SPEC §12). Owner: WS-F.
 *
 * Messages live as a JSON array on one row per shop rather than as their own
 * table: the whole conversation is read and written together, never queried
 * across, and F4 renders it as a single list.
 */
import { newId, newSecret } from '@merchant/config/ids';
import { builderMessageSchema, THEME_GENERATION_APOLOGY } from '@merchant/contracts/theme';
import type { TenantClient } from '@merchant/db/tenant';
import type { z } from 'zod';

export type BuilderMessage = z.infer<typeof builderMessageSchema>;

/** What the JSON column actually holds — shaped like a message, trusted for nothing. */
type StoredMessage = { id?: string; status?: string; content?: string; createdAt?: string };

/** The blob is read and written whole, so it must not grow without bound. */
const MAX_STORED_MESSAGES = 200;

/** A pending bubble older than this lost its worker; the sweep resolves it. */
export const STALE_PENDING_MS = 5 * 60_000;

const CAS_ATTEMPTS = 3;

export function newMessageId(): string {
  return `msg_${newSecret(12)}`;
}

/**
 * One conversation per shop, created on first use.
 *
 * Two first messages can race to create it. There is no unique index on
 * `shopId` to lean on (that needs a migration — logged as a follow-up), so the
 * loser of the race drops its row and both clients converge on the earliest
 * log. Without this, one of the two messages silently lands in an orphan row
 * and looks to the merchant like it vanished.
 */
export async function getOrCreateConversation(db: TenantClient, shopId: string) {
  const existing = await db.builderConversation.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) return existing;

  // shopId is explicit for Prisma's types; dbForShop overrides it (WS-D note).
  const created = await db.builderConversation.create({
    data: { id: newId('conversation'), shopId, messages: [] },
  });

  const canonical = await db.builderConversation.findFirst({ orderBy: { createdAt: 'asc' } });
  if (canonical && canonical.id !== created.id) {
    await db.builderConversation.delete({ where: { id: created.id } });
    return canonical;
  }
  return created;
}

export function parseMessages(raw: unknown): BuilderMessage[] {
  if (!Array.isArray(raw)) return [];
  // A message the schema no longer recognises is dropped rather than fatal:
  // the chat is a log, and one bad row must not brick the builder.
  return raw.flatMap((entry) => {
    const parsed = builderMessageSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function makeMessage(
  role: 'user' | 'assistant',
  content: string,
  overrides: Partial<BuilderMessage> = {},
): BuilderMessage {
  return builderMessageSchema.parse({
    id: newMessageId(),
    role,
    content,
    themeVersionId: null,
    status: 'complete',
    createdAt: new Date().toISOString(),
    ...overrides,
  });
}

/**
 * Compare-and-set write of the whole messages blob. The route and the worker
 * both do read-modify-write on this one JSON column, and the worker's window is
 * a 30–60s model call — a plain update built from a stale read silently deletes
 * whatever landed in between. So: read fresh, compute `next` from the FRESH
 * row, and write guarded on `updatedAt` (Prisma `@updatedAt`, so any concurrent
 * write changes it). On a lost race, retry; after CAS_ATTEMPTS, last-writer-wins
 * with a fresh read rather than throwing — the chat must never brick on a race.
 *
 * The worker mirrors this loop inline (apps/worker/src/jobs/ai-theme-generate.ts);
 * keep the two in step.
 */
async function casWriteMessages(
  db: TenantClient,
  conversationId: string,
  compute: (stored: StoredMessage[]) => StoredMessage[],
) {
  for (let attempt = 0; attempt <= CAS_ATTEMPTS; attempt += 1) {
    const row = await db.builderConversation.findFirst({ where: { id: conversationId } });
    const stored = (Array.isArray(row?.messages) ? row.messages : []) as StoredMessage[];
    const next = compute(stored);
    if (!row || attempt === CAS_ATTEMPTS) {
      await db.builderConversation.update({
        where: { id: conversationId },
        data: { messages: next },
      });
      return next;
    }
    const { count } = await db.builderConversation.updateMany({
      where: { id: conversationId, updatedAt: row.updatedAt },
      data: { messages: next },
    });
    if (count === 1) return next;
  }
  /* unreachable — the loop always returns */
  return [];
}

/**
 * Appends to the STORED array, not to `parseMessages` of it: parsing drops
 * entries the schema no longer recognises, and writing that back would delete
 * them from the merchant's history for good. Capped at the most recent
 * MAX_STORED_MESSAGES so the blob stays bounded.
 */
export async function appendMessages(
  db: TenantClient,
  conversationId: string,
  messages: BuilderMessage[],
) {
  return casWriteMessages(db, conversationId, (stored) =>
    [...stored, ...messages].slice(-MAX_STORED_MESSAGES),
  );
}

/** Resolve a pending message in place, rather than appending a second bubble. */
export async function replaceMessage(
  db: TenantClient,
  conversationId: string,
  messageId: string,
  next: BuilderMessage,
) {
  return casWriteMessages(db, conversationId, (stored) =>
    stored.map((message) => (message?.id === messageId ? { ...next, id: messageId } : message)),
  );
}

/**
 * Backstop for a stranded generation: a job can die past its last retry (or the
 * queue can lose it) with the bubble still `pending`, and the admin polls this
 * conversation forever. Anything pending for longer than STALE_PENDING_MS gets
 * the same apology the worker would have written.
 */
export async function sweepStalePending(
  db: TenantClient,
  conversationId: string,
  parsed: BuilderMessage[],
): Promise<BuilderMessage[]> {
  const cutoff = Date.now() - STALE_PENDING_MS;
  const stale = new Set(
    parsed
      .filter((m) => m.status === 'pending' && new Date(m.createdAt).getTime() < cutoff)
      .map((m) => m.id),
  );
  if (stale.size === 0) return parsed;

  const next = await casWriteMessages(db, conversationId, (stored) =>
    stored.map((message) =>
      // Re-check `pending` on the fresh row: the worker may have resolved it
      // between our read and this write.
      message?.id && stale.has(message.id) && message.status === 'pending'
        ? { ...message, status: 'failed', content: THEME_GENERATION_APOLOGY }
        : message,
    ),
  );
  return parseMessages(next);
}
