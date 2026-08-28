/**
 * Staff sessions (SPEC §8): opaque id in a signed httpOnly cookie, payload in
 * Redis, 7-day sliding expiry.
 *
 * The cookie carries no claims — swapping the payload for a JWT would make
 * logout and permission changes unenforceable, which the staff-settings page
 * (A4) needs.
 *
 * Owner: WS-A.
 */

import type { StaffRole } from '@merchant/config/constants';
import { SESSION_COOKIE } from '@merchant/config/constants';
import { env, isProduction } from '@merchant/config/env';
import { newSecret } from '@merchant/config/ids';
import type { Permissions } from '@merchant/contracts/auth';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { redis } from './redis.ts';

export type SessionData = {
  shopId: string;
  staffUserId: string;
  role: StaffRole;
  /** Snapshot taken at login. A4 destroys sessions when it edits a staff user. */
  permissions: Permissions;
};

const key = (id: string) => `sess:${id}`;

/**
 * Reverse index: which sessions belong to a staff user. Without it, revoking
 * someone's access could not reach the tab they already have open, because a
 * session is only findable by its own opaque id.
 */
const userKey = (staffUserId: string) => `sess:user:${staffUserId}`;

const ttlSeconds = () => env().SESSION_TTL_DAYS * 24 * 60 * 60;

/**
 * The index outlives a session on purpose. Reads slide a session's expiry but
 * not the index's, so an index pinned to the same TTL could lapse under an
 * active user and leave their session unrevokable. Double the window costs a
 * few bytes and avoids touching Redis on every authenticated request.
 */
const indexTtlSeconds = () => ttlSeconds() * 2;

export async function createSession(data: SessionData): Promise<string> {
  // 256 bits of entropy: the cookie signature stops tampering, but the id is
  // the only thing standing between a guess and someone's store.
  const id = newSecret(32);
  await redis()
    .multi()
    .set(key(id), JSON.stringify(data), 'EX', ttlSeconds())
    .sadd(userKey(data.staffUserId), id)
    .expire(userKey(data.staffUserId), indexTtlSeconds())
    .exec();
  return id;
}

/** Reads a session and slides its expiry in one round trip. */
export async function getSession(id: string): Promise<SessionData | null> {
  const raw = await redis().getex(key(id), 'EX', ttlSeconds());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    // Unparseable payload means a corrupt or foreign key. Treat it as absent
    // rather than 500-ing every request that presents it.
    return null;
  }
}

export async function destroySession(id: string): Promise<void> {
  // Read first, so the reverse index does not keep a dangling member.
  const data = await getSession(id);
  await redis().del(key(id));
  if (data) await redis().srem(userKey(data.staffUserId), id);
}

/**
 * End every session a staff user has (A4).
 *
 * Sessions snapshot role and permissions at login, so editing or removing a
 * staff member is only enforced once their existing sessions are gone —
 * otherwise the tab they already have open keeps the access just revoked.
 */
export async function destroySessionsForUser(staffUserId: string): Promise<void> {
  const ids = await redis().smembers(userKey(staffUserId));
  if (ids.length > 0) await redis().del(...ids.map(key));
  await redis().del(userKey(staffUserId));
}

/** Remaining lifetime in seconds, or -2 when the session is gone. Used by tests. */
export async function sessionTtlSeconds(id: string): Promise<number> {
  return redis().ttl(key(id));
}

/**
 * Write the session cookie. Called on login AND on every authenticated request:
 * Redis slides its TTL on each read, so a cookie whose Max-Age was fixed at
 * login would expire in the browser exactly seven days after sign-in no matter
 * how active the user was. Both halves have to slide together.
 */
export function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    signed: true,
    path: '/',
    maxAge: ttlSeconds(),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * The session id from the request cookie, or null if absent or tampered with.
 * Never throws — a malformed cookie is a 401, not a 500.
 */
export function sessionIdFromRequest(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid && unsigned.value ? unsigned.value : null;
}
