/**
 * Signed tokens for the storefront's cache-revalidation endpoint (issue E7).
 *
 * The API mints one when a theme is published; the storefront verifies it
 * before busting its cached theme fetch. Same idea as F3's preview tokens —
 * an unauthenticated cache-buster is a free DB-load amplifier, so the ping
 * must prove it came from us. HMAC over `{slug}.{expiry}` with SESSION_SECRET,
 * which both apps already hold; 60s TTL bounds replay.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.ts';

const TTL_MS = 60_000;

function hmac(slug: string, expiresAt: number): string {
  return createHmac('sha256', env().SESSION_SECRET)
    .update(`${slug}.${expiresAt}`)
    .digest('base64url');
}

/** `{expiresAt}.{signature}` — the slug is implied by the Host the ping targets. */
export function signRevalidateToken(slug: string, now: number = Date.now()): string {
  const expiresAt = now + TTL_MS;
  return `${expiresAt}.${hmac(slug, expiresAt)}`;
}

export function verifyRevalidateToken(
  slug: string,
  token: string,
  now: number = Date.now(),
): boolean {
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;

  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(hmac(slug, expiresAt));
  return given.length === expected.length && timingSafeEqual(given, expected);
}
