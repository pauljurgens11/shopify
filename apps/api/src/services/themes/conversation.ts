/**
 * The builder chat log (SPEC §12). Owner: WS-F.
 *
 * Messages live as a JSON array on one row per shop rather than as their own
 * table: the whole conversation is read and written together, never queried
 * across, and F4 renders it as a single list.
 */
import { newId, newSecret } from '@merchant/config/ids';
import { builderMessageSchema } from '@merchant/contracts/theme';
import type { TenantClient } from '@merchant/db/tenant';
import type { z } from 'zod';

export type BuilderMessage = z.infer<typeof builderMessageSchema>;

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
 * Appends to the STORED array, not to `parseMessages` of it: parsing drops
 * entries the schema no longer recognises, and writing that back would delete
 * them from the merchant's history for good.
 */
export async function appendMessages(
  db: TenantClient,
  conversationId: string,
  messages: BuilderMessage[],
) {
  const row = await db.builderConversation.findFirst({ where: { id: conversationId } });
  const stored = Array.isArray(row?.messages) ? row.messages : [];
  const next = [...stored, ...messages];
  await db.builderConversation.update({
    where: { id: conversationId },
    data: { messages: next },
  });
  return next;
}

/** Resolve a pending message in place, rather than appending a second bubble. */
export async function replaceMessage(
  db: TenantClient,
  conversationId: string,
  messageId: string,
  next: BuilderMessage,
) {
  const row = await db.builderConversation.findFirst({ where: { id: conversationId } });
  const stored = (Array.isArray(row?.messages) ? row.messages : []) as { id?: string }[];
  const messages = stored.map((message) =>
    message?.id === messageId ? { ...next, id: messageId } : message,
  );
  await db.builderConversation.update({ where: { id: conversationId }, data: { messages } });
  return messages;
}
