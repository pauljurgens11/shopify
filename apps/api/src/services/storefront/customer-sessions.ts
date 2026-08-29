/**
 * Storefront customer sessions (SPEC §8 — the optional account path). Owner: WS-E.
 *
 * Same machinery as A1's staff sessions — opaque id in a signed httpOnly
 * cookie, payload in Redis, sliding expiry — but deliberately a separate
 * cookie, key prefix and payload shape. Customer auth is not staff auth: a
 * customer session carries no role and no permissions, and nothing that reads
 * `sess:*` can ever mistake a shopper for staff, because these live under
 * `csess:*`.
 *
 * The payload pins the shopId so a session minted on one shop's host is a 401
 * on every other shop's host — the tenancy story extends to shoppers.
 */
import { CUSTOMER_SESSION_COOKIE } from '@merchant/config/constants';
import { env, isProduction } from '@merchant/config/env';
import { newSecret } from '@merchant/config/ids';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from '../../lib/redis.ts';

export type CustomerSessionData = {
  shopId: string;
  customerId: string;
};

const key = (id: string) => `csess:${id}`;

/** Customers get the same sliding window as staff — one TTL knob, not two. */
const ttlSeconds = () => env().SESSION_TTL_DAYS * 24 * 60 * 60;

export async function createCustomerSession(data: CustomerSessionData): Promise<string> {
  // 256 bits, like staff sessions: the signature stops tampering, entropy
  // stops guessing. No reverse index — nothing revokes customer sessions in
  // bulk (there is no A4 for shoppers), and logout knows its own id.
  const id = newSecret(32);
  await redis().set(key(id), JSON.stringify(data), 'EX', ttlSeconds());
  return id;
}

/** Reads a session and slides its expiry in one round trip. */
export async function getCustomerSession(id: string): Promise<CustomerSessionData | null> {
  const raw = await redis().getex(key(id), 'EX', ttlSeconds());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerSessionData;
  } catch {
    // Corrupt or foreign payload → treat as signed out, never a 500.
    return null;
  }
}

export async function destroyCustomerSession(id: string): Promise<void> {
  await redis().del(key(id));
}

export function setCustomerSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(CUSTOMER_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    signed: true,
    // Host-only, like the cart cookie: scoped to `{slug}.lvh.me`, so one
    // shop's session cookie is not even sent to another shop's storefront.
    path: '/',
    maxAge: ttlSeconds(),
  });
}

export function clearCustomerSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(CUSTOMER_SESSION_COOKIE, { path: '/' });
}

/** The session id from the cookie, or null if absent or tampered with. */
export function customerSessionIdFromRequest(request: FastifyRequest): string | null {
  const raw = request.cookies[CUSTOMER_SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}
