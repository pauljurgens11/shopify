/**
 * Staff auth (SPEC §8): `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`.
 *
 * These are the only routes that may resolve a shop for themselves — the
 * tenancy plugin deliberately skips `/auth/*`, because this is where a session
 * comes from. Owner: WS-A.
 */
import { RATE_LIMITS, type StaffRole } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import type { Permissions } from '@merchant/contracts/auth';
import { loginInput, sessionResponse, signupInput } from '@merchant/contracts/auth';
import { dbAdmin, type Shop, type StaffUser } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { badRequest, conflict, unauthorized } from '../../lib/errors.ts';
import { hashPassword, verifyPassword } from '../../lib/passwords.ts';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  sessionIdFromRequest,
  setSessionCookie,
} from '../../lib/sessions.ts';
import { slugCandidates, slugify } from '../../lib/slug.ts';
import { resolveFromSession } from '../../plugins/tenancy.ts';
import { defaultShippingRates } from '../../services/settings/shipping.ts';
import { installDefaultCollection, installInitialTheme } from '../../services/themes/onboarding.ts';

/** Prisma rows → the `sessionResponse` contract. Never leaks `passwordHash`. */
function toSessionResponse(user: StaffUser, shop: Shop) {
  return sessionResponse.parse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions ?? {},
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    shop: {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      currencyCode: shop.currencyCode,
      timezone: shop.timezone,
    },
  });
}

/** The candidates no shop holds right now. Racy by nature — see createShop. */
async function freeSlugs(candidates: string[]): Promise<string[]> {
  const taken = await dbAdmin.shop.findMany({
    where: { slug: { in: candidates } },
    select: { slug: true },
  });
  const used = new Set(taken.map((s) => s.slug));
  return candidates.filter((c) => !used.has(c));
}

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

/**
 * Create shop + order sequence + owner atomically, taking the first candidate
 * slug that actually inserts.
 *
 * The free-slug check and the insert cannot be one operation, so two concurrent
 * signups can both see the same slug free. Walking the remaining candidates on
 * a unique violation means the loser of that race still gets a store, instead
 * of a 409 naming a URL they never chose.
 *
 * dbAdmin is correct here: there is no tenant yet to scope to. One of the
 * sanctioned unscoped call sites (SPEC §6).
 */
async function createShop(
  candidates: string[],
  input: { shopName: string; email: string; firstName?: string; lastName?: string },
  passwordHash: string,
): Promise<{ shop: Shop; user: StaffUser }> {
  for (const slug of candidates) {
    try {
      return await dbAdmin.$transaction(async (tx) => {
        const shop = await tx.shop.create({
          data: { id: newId('shop'), slug, name: input.shopName, email: input.email },
        });
        // Inside the transaction, not alongside installInitialTheme: a shop
        // that exists with no rate has a checkout nobody can finish, so it must
        // never be a state the database can hold. Priced off the row's own
        // currency rather than a second copy of the column default.
        const shopWithRates = await tx.shop.update({
          where: { id: shop.id },
          data: { shippingRates: defaultShippingRates(shop.currencyCode) },
        });
        // Order numbers start at #1001 from the shop's first minute (SPEC §5);
        // the orders service takes a row lock on this row and cannot create it.
        await tx.orderSequence.create({ data: { shopId: shop.id } });
        const user = await tx.staffUser.create({
          data: {
            id: newId('user'),
            shopId: shop.id,
            email: input.email,
            passwordHash,
            firstName: input.firstName ?? null,
            lastName: input.lastName ?? null,
            role: 'owner',
          },
        });
        return { shop: shopWithRates, user };
      });
    } catch (error) {
      // The only unique constraint reachable here is shops.slug: the shop is
      // brand new, so its owner cannot collide on (shopId, email).
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw conflict('That store URL is already taken.', 'shopSlug');
}

export default async function routes(app: FastifyInstance) {
  /* ---------------------------------------------------------------- signup */
  app.post('/signup', async (request, reply) => {
    const input = signupInput.parse(request.body);

    // An explicit slug is honoured or refused; a derived one falls through to
    // `-2`, `-3`… the way Shopify renames a duplicate store URL.
    const candidates = await freeSlugs(
      input.shopSlug ? [input.shopSlug] : slugCandidates(slugify(input.shopName)),
    );
    if (candidates.length === 0) throw conflict('That store URL is already taken.', 'shopSlug');

    const passwordHash = await hashPassword(input.password);
    const created = await createShop(candidates, input, passwordHash);

    // A new store opens on the default preset rather than a blank page, and on
    // the `featured` collection that preset points at (SPEC §12 onboarding).
    // Neither throws — see installInitialTheme. Owner: WS-F.
    await Promise.all([
      installInitialTheme(created.shop.id),
      installDefaultCollection(created.shop.id),
    ]);

    const sessionId = await createSession({
      shopId: created.shop.id,
      staffUserId: created.user.id,
      role: 'owner',
      permissions: {},
    });
    setSessionCookie(reply, sessionId);

    // Signing up logs you in, like Shopify — the next screen is the admin.
    return reply.status(201).send(toSessionResponse(created.user, created.shop));
  });

  /* ----------------------------------------------------------------- login */
  app.post(
    '/login',
    // SPEC §8: 10/min/IP. The limiter is registered `global: false` in app.ts.
    {
      config: {
        rateLimit: { max: RATE_LIMITS.login.max, timeWindow: RATE_LIMITS.login.windowMs },
      },
    },
    async (request, reply) => {
      const input = loginInput.parse(request.body);

      // Platform-level auth lookup — the second sanctioned unscoped call site.
      // Email is unique per shop, not globally: one person can be staff in two
      // stores, which is what `shopSlug` disambiguates.
      let shopId: string | undefined;
      if (input.shopSlug) {
        const shop = await dbAdmin.shop.findUnique({
          where: { slug: input.shopSlug },
          select: { id: true },
        });
        if (!shop) {
          await verifyPassword(null, input.password);
          throw unauthorized('Incorrect email or password.');
        }
        shopId = shop.id;
      }

      const candidates = await dbAdmin.staffUser.findMany({
        where: { email: input.email, ...(shopId ? { shopId } : {}) },
        take: 2,
      });

      if (candidates.length > 1) {
        throw badRequest(
          'Several stores use this email. Choose a store to sign in to.',
          'shopSlug',
        );
      }

      const user = candidates[0];
      // verifyPassword burns the same argon2 work when there is no user, so a
      // wrong password and an unknown email are indistinguishable from outside.
      const passwordOk = await verifyPassword(user?.passwordHash, input.password);
      if (!user || !passwordOk) throw unauthorized('Incorrect email or password.');

      const [shop] = await Promise.all([
        dbAdmin.shop.findUniqueOrThrow({ where: { id: user.shopId } }),
        dbAdmin.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      ]);

      const sessionId = await createSession({
        shopId: user.shopId,
        staffUserId: user.id,
        role: user.role as StaffRole,
        permissions: (user.permissions ?? {}) as Permissions,
      });
      setSessionCookie(reply, sessionId);

      return toSessionResponse(user, shop);
    },
  );

  /* ---------------------------------------------------------------- logout */
  // Not session-gated: signing out of an already-dead session is a success, not
  // a 401 — otherwise the admin gets stuck holding a cookie it cannot clear.
  app.post('/logout', async (request, reply) => {
    const sessionId = sessionIdFromRequest(request);
    if (sessionId) await destroySession(sessionId);
    clearSessionCookie(reply);
    return reply.status(204).send();
  });

  /* -------------------------------------------------------------------- me */
  app.get('/me', { preHandler: resolveFromSession }, async (request) => {
    // request.db is scoped to the session's shop, so neither read can reach
    // another tenant even if the session payload were wrong.
    const [user, shop] = await Promise.all([
      request.db.staffUser.findFirst({ where: { id: request.staffUserId } }),
      request.db.shop.findFirst(),
    ]);

    // The staff user was removed while the session outlived them (A4 can do that).
    if (!user || !shop) throw unauthorized('Your session is no longer valid. Sign in again.');

    return toSessionResponse(user, shop);
  });
}
