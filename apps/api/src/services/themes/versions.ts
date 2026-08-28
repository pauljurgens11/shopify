/**
 * ThemeVersion lifecycle (SPEC §12). Owner: WS-F.
 *
 * One rule holds this file together: a shop has AT MOST ONE published version.
 * The storefront resolves its theme by `status: 'published'`, so two published
 * rows is not a tidiness problem — it is a store that renders differently on
 * every request.
 */
import { newId } from '@merchant/config/ids';
import {
  type ThemeDoc,
  themeDocSchema,
  themeVersionSummary,
  validateThemeDoc,
} from '@merchant/contracts/theme';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, notFound } from '../../lib/errors.ts';

type ThemeVersionRow = {
  id: string;
  status: string;
  themeJson: unknown;
  createdByMessage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export function toSummary(row: ThemeVersionRow) {
  return themeVersionSummary.parse({
    id: row.id,
    status: row.status,
    createdByMessage: row.createdByMessage,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export function toDetail(row: ThemeVersionRow) {
  return { ...toSummary(row), themeJson: row.themeJson };
}

/**
 * The one gate every write goes through. `themeJson` is the only column the
 * storefront renderer trusts without checking, and the model is what fills it.
 */
export function assertValidThemeDoc(doc: unknown): ThemeDoc {
  const parsed = themeDocSchema.safeParse(doc);
  if (!parsed.success) {
    throw badRequest(`Theme document is not valid: ${parsed.error.issues[0]?.message}`);
  }
  const problems = validateThemeDoc(parsed.data);
  if (problems.length > 0) throw badRequest(`Theme document is not valid: ${problems[0]}`);
  return parsed.data;
}

/**
 * `shopId` is passed explicitly even though `dbForShop` stamps it — Prisma's
 * generated types require it on a create, and the extension overrides whatever
 * is written here (see docs/AGENT-LOG.md, WS-D).
 */
export async function createDraft(
  db: TenantClient,
  shopId: string,
  input: { themeJson: ThemeDoc; createdByMessage?: string | null; conversationId?: string | null },
) {
  return db.themeVersion.create({
    data: {
      id: newId('theme'),
      shopId,
      themeJson: input.themeJson,
      tokens: input.themeJson.tokens,
      status: 'draft',
      createdByMessage: input.createdByMessage ?? null,
      conversationId: input.conversationId ?? null,
    },
  });
}

export async function getVersion(db: TenantClient, id: string) {
  const row = await db.themeVersion.findFirst({ where: { id } });
  if (!row) throw notFound('Theme version not found.');
  return row;
}

/**
 * Demote-then-promote inside one transaction. Split across two writes the store
 * has either zero or two published themes for the window in between, and the
 * storefront picks whichever `findFirst` happens to return.
 */
export async function publishVersion(db: TenantClient, id: string) {
  await getVersion(db, id);
  return db.$transaction(async (tx) => {
    await tx.themeVersion.updateMany({
      where: { status: 'published', id: { not: id } },
      data: { status: 'draft', publishedAt: null },
    });
    return tx.themeVersion.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  });
}

/** Restore copies forward rather than mutating history — the old row stays readable. */
export async function restoreVersion(db: TenantClient, shopId: string, id: string) {
  const source = await getVersion(db, id);
  return createDraft(db, shopId, {
    themeJson: assertValidThemeDoc(source.themeJson),
    createdByMessage: `Restored from ${new Date(source.createdAt).toISOString().slice(0, 10)}`,
  });
}
