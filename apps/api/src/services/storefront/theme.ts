/**
 * Published theme lookup and the builder's preview token (SPEC §10, §12).
 * Owner: WS-E.
 *
 * The storefront renders whatever `themeJson` this returns, so two rules hold:
 * only a `published` version is served to the public, and the document is
 * re-parsed through `themeDocSchema` on the way out. A version written before a
 * schema change would otherwise reach the renderer as an unvalidated object.
 *
 * Preview: F4's builder needs to show an unpublished draft on the real
 * storefront. A raw `?preview=thm_…` would let anyone enumerate drafts, so the
 * parameter is HMAC-signed with `SESSION_SECRET`. F3/F4 build the link with
 * `signThemePreview(themeVersionId)`; nothing else can mint one.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@merchant/config/env';
import type { ThemeDoc } from '@merchant/contracts/theme';
import { themeDocSchema } from '@merchant/contracts/theme';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';

const SEPARATOR = '.';

function signature(themeVersionId: string): string {
  return createHmac('sha256', env().SESSION_SECRET).update(themeVersionId).digest('hex');
}

/** `thm_01ABC.9f86d0…` — the value F3/F4 put in `?preview=`. */
export function signThemePreview(themeVersionId: string): string {
  return `${themeVersionId}${SEPARATOR}${signature(themeVersionId)}`;
}

/**
 * The theme version id a preview token vouches for, or null.
 *
 * Null for anything unsigned, tampered with or malformed — the caller falls
 * back to the published theme rather than erroring, so a stale builder link
 * shows the live store instead of a broken one.
 */
export function verifyThemePreview(token: string | undefined): string | null {
  if (!token) return null;
  const separator = token.lastIndexOf(SEPARATOR);
  if (separator <= 0) return null;

  const themeVersionId = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1), 'utf8');
  const expected = Buffer.from(signature(themeVersionId), 'utf8');

  // Length check first: timingSafeEqual throws on a length mismatch.
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? themeVersionId : null;
}

export interface ResolvedTheme {
  themeVersionId: string;
  theme: ThemeDoc;
  /** True when a signed preview overrode the published version. */
  isPreview: boolean;
}

export async function resolveTheme(
  db: TenantClient,
  previewToken?: string,
): Promise<ResolvedTheme> {
  const previewId = verifyThemePreview(previewToken);

  if (previewId) {
    // Scoped by `db`, so a validly-signed token for another shop's draft is
    // simply not found here — the signature proves intent, not authority.
    const draft = await db.themeVersion.findFirst({ where: { id: previewId } });
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
  if (!published) throw notFound('Published theme');

  return {
    themeVersionId: published.id,
    theme: themeDocSchema.parse(published.themeJson),
    isPreview: false,
  };
}
