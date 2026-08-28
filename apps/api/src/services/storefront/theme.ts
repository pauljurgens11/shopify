/**
 * Published theme lookup for the storefront (SPEC §10, §12). Owner: WS-E.
 *
 * The storefront renders whatever `themeJson` this returns, so two rules hold:
 * only a `published` version is served to the public, and the document is
 * re-parsed through `themeDocSchema` on the way out — a version written before
 * a schema change would otherwise reach the renderer unvalidated.
 *
 * Preview tokens are WS-F's (`services/themes/preview-token.ts`), minted by
 * `GET /admin/api/themes/preview-token`. This module only verifies them: one
 * signing scheme, one place to reason about it. F3's token is bound to a shop
 * and a version and expires, so a leaked link cannot be replayed against
 * another store or held onto.
 */
import type { ThemeDoc } from '@merchant/contracts/theme';
import { themeDocSchema } from '@merchant/contracts/theme';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';
import { verifyPreviewToken } from '../themes/preview-token.ts';

export interface ResolvedTheme {
  themeVersionId: string;
  theme: ThemeDoc;
  /** True when a valid preview token overrode the published version. */
  isPreview: boolean;
}

export async function resolveTheme(
  db: TenantClient,
  shopId: string,
  previewToken?: string,
): Promise<ResolvedTheme> {
  const preview = previewToken ? verifyPreviewToken(previewToken) : null;

  // The token carries the shop it was minted for; a validly-signed token for
  // another store must not resolve here even though `db` would already scope
  // the lookup. Belt and braces, because this is the one unauthenticated path
  // that can reach an unpublished row.
  if (preview && preview.shopId === shopId) {
    const draft = await db.themeVersion.findFirst({ where: { id: preview.themeVersionId } });
    if (draft) {
      return {
        themeVersionId: draft.id,
        theme: themeDocSchema.parse(draft.themeJson),
        isPreview: true,
      };
    }
  }

  const published = await db.themeVersion.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
  });
  // An expired or tampered token falls through to here rather than erroring, so
  // a stale builder link shows the live store instead of a broken page.
  if (!published) throw notFound('Published theme');

  return {
    themeVersionId: published.id,
    theme: themeDocSchema.parse(published.themeJson),
    isPreview: false,
  };
}
