/**
 * Shared test rig for the API. A2's tenancy suite builds on this file — keep it
 * additive.
 *
 * `buildTestApp()` returns the real app with a handful of probe routes bolted
 * on. Probes exist because A1 owns no `/admin/api/*` route of its own: the only
 * honest way to assert "tenant resolution wired `request.db` to the right shop"
 * is to register a route that reads it. They are test-only, so no dead endpoint
 * ships (CLAUDE.md §8).
 */
import { createHash } from 'node:crypto';
import { SESSION_COOKIE, type StaffRole } from '@merchant/config/constants';
import { newApiToken, newId, newSecret } from '@merchant/config/ids';
import type { Permissions } from '@merchant/contracts/auth';
import { dbAdmin } from '@merchant/db/client';
import { hash } from '@node-rs/argon2';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.ts';
import { requirePermission } from '../src/lib/permissions.ts';
import { createSession } from '../src/lib/sessions.ts';

export const TEST_PASSWORD = 'password123';

/** Unique per run, so a rerun (or a parallel package's tests) never collides. */
export function uniqueSlug(prefix = 'test'): string {
  return `${prefix}-${newSecret(6)}`;
}

export type TestShop = {
  shopId: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
};

/**
 * A shop plus its owner, created unscoped — the same sanctioned `dbAdmin` use
 * as seed (SPEC §6).
 */
export async function createTestShop(options: { slug?: string } = {}): Promise<TestShop> {
  const slug = options.slug ?? uniqueSlug();
  const shopId = newId('shop');
  const ownerId = newId('user');
  const ownerEmail = `owner@${slug}.test`;

  await dbAdmin.shop.create({
    data: { id: shopId, slug, name: `Test ${slug}`, email: ownerEmail },
  });
  await dbAdmin.staffUser.create({
    data: {
      id: ownerId,
      shopId,
      email: ownerEmail,
      passwordHash: await hash(TEST_PASSWORD),
      role: 'owner',
    },
  });

  return { shopId, slug, ownerId, ownerEmail };
}

export async function createStaffUser(
  shopId: string,
  input: { email: string; role?: string; permissions?: Record<string, boolean> },
): Promise<string> {
  const id = newId('user');
  await dbAdmin.staffUser.create({
    data: {
      id,
      shopId,
      email: input.email,
      passwordHash: await hash(TEST_PASSWORD),
      role: input.role ?? 'staff',
      permissions: input.permissions ?? {},
    },
  });
  return id;
}

/** An Admin API token for `shopId`. Returns the plaintext; only the hash is stored. */
export async function createApiToken(shopId: string): Promise<string> {
  const token = newApiToken();
  await dbAdmin.app.create({
    data: {
      id: newId('app'),
      shopId,
      name: 'Test app',
      apiTokenHash: createHash('sha256').update(token).digest('hex'),
      tokenSuffix: token.slice(-4),
    },
  });
  return token;
}

/**
 * Deletes shops and everything hanging off them. Tests share a database with
 * whatever `pnpm seed` put there, so cleanup is by explicit id, never a
 * truncate.
 */
export async function deleteTestShops(shopIds: string[]): Promise<void> {
  if (shopIds.length === 0) return;
  const where = { shopId: { in: shopIds } };
  // Options, variants and images cascade from the product row; inventory levels
  // cascade from the variant and from the location. Adjustments have no FK — the
  // history deliberately outlives what it describes — so they go by hand.
  await dbAdmin.product.deleteMany({ where });
  await dbAdmin.inventoryAdjustment.deleteMany({ where });
  await dbAdmin.location.deleteMany({ where });
  await dbAdmin.app.deleteMany({ where });
  await dbAdmin.staffUser.deleteMany({ where });
  await dbAdmin.orderSequence.deleteMany({ where: { shopId: { in: shopIds } } });
  await dbAdmin.shop.deleteMany({ where: { id: { in: shopIds } } });
}

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();

  // Registered before `ready()`, so the root-level tenancy/CSRF hooks apply.
  app.get('/admin/api/__probe', async (request) => ({
    shopId: request.shopId,
    staffUserId: request.staffUserId,
    role: request.staffRole,
    // Proves the scoped client is usable, and that it is bound to THIS shop.
    shopName: (await request.db.shop.findFirst())?.name ?? null,
  }));

  app.post('/admin/api/__probe', async () => ({ ok: true }));

  app.get(
    '/admin/api/__probe-orders',
    { preHandler: requirePermission('orders') },
    async (request) => ({ shopId: request.shopId }),
  );

  app.get('/storefront/api/__probe', async (request) => ({
    shopId: request.shopId,
    shopSlug: request.shopSlug,
  }));

  app.get('/api/__probe', async (request) => ({ shopId: request.shopId }));

  await app.ready();
  return app;
}

/** `Set-Cookie` on an inject response → a `Cookie` request header. */
export function cookieHeader(response: {
  cookies: Array<{ name: string; value: string }>;
}): string {
  return response.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * A signed session cookie, minted straight into Redis.
 *
 * Tests that are about tenancy or authorization use this instead of posting to
 * `/auth/login` — SPEC §8 caps login at 10/min/IP, and every `inject` shares
 * 127.0.0.1, so a suite that logs in for each case rate-limits itself and then
 * reports 401s that have nothing to do with what it was testing.
 */
export async function sessionCookie(
  app: FastifyInstance,
  session: {
    shopId: string;
    staffUserId: string;
    role?: StaffRole;
    permissions?: Permissions;
  },
): Promise<string> {
  const id = await createSession({
    shopId: session.shopId,
    staffUserId: session.staffUserId,
    role: session.role ?? 'owner',
    permissions: session.permissions ?? {},
  });
  return `${SESSION_COOKIE}=${app.signCookie(id)}`;
}
