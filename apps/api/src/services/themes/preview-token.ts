/**
 * Signed preview tokens for unpublished themes (SPEC §12). Owner: WS-F.
 *
 * The builder previews a DRAFT on the public storefront, which has no session
 * and no auth. A guessable id would publish every merchant's unreleased theme,
 * so the storefront is handed a token that is signed, expiring, and bound to
 * one shop AND one version — never a bare id.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@merchant/config/env';

/** Long enough to open the preview and click around; short enough to be useless if it leaks. */
export const PREVIEW_TOKEN_TTL_SECONDS = 15 * 60;

type Payload = { s: string; v: string; e: number };

function sign(payload: string): string {
  return createHmac('sha256', env().SESSION_SECRET).update(payload).digest('base64url');
}

export function signPreviewToken(
  shopId: string,
  themeVersionId: string,
  ttlSeconds: number = PREVIEW_TOKEN_TTL_SECONDS,
): string {
  const payload: Payload = {
    s: shopId,
    v: themeVersionId,
    e: Date.now() + ttlSeconds * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * `null` for anything that is not a currently-valid token — expired, tampered,
 * or malformed. The caller cannot tell the three apart, which is the point.
 */
export function verifyPreviewToken(
  token: string,
): { shopId: string; themeVersionId: string } | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  // Compare before parsing, and in constant time — a length check alone leaks.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Payload;
    if (typeof payload.s !== 'string' || typeof payload.v !== 'string') return null;
    if (typeof payload.e !== 'number' || payload.e <= Date.now()) return null;
    return { shopId: payload.s, themeVersionId: payload.v };
  } catch {
    return null;
  }
}
