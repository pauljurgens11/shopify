/**
 * `/storefront/api/customers/*` — storefront customer accounts (SPEC §8).
 * Owner: WS-E (E5).
 *
 * The optional path: guest checkout is the default, so this surface is small —
 * register, login, logout, `/me` (read + one edit form), `/me/orders`. The shop
 * comes from the Host header like every storefront route; the customer comes
 * from a dedicated session cookie (`services/storefront/customer-sessions.ts`).
 * Customer auth ≠ staff auth: nothing here touches `sess:*`, roles or
 * permissions, and no admin route reads this cookie.
 *
 * Register claims history: an email that already ordered as a guest gets its
 * password set on the EXISTING row (C4's find-or-create), so their orders are
 * already theirs on first login. Registering over a row that has a password is
 * a 409 — overwriting it would be account takeover by signup form.
 */
import { RATE_LIMITS } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import type { StorefrontCustomer, StorefrontOrderSummary } from '@merchant/contracts/customers';
import {
  customerLoginInput,
  customerRegisterInput,
  storefrontCustomerOrdersResponse,
  storefrontCustomerResponse,
  updateStorefrontCustomerInput,
} from '@merchant/contracts/customers';
import { listOrdersQuery, type OrderSummary } from '@merchant/contracts/orders';
import type { Prisma } from '@merchant/db/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { conflict, unauthorized } from '../../../lib/errors.ts';
import { hashPassword, verifyPassword } from '../../../lib/passwords.ts';
import { requireShop } from '../../../plugins/tenancy.ts';
import { findOrCreateByEmail } from '../../../services/customers/customers.ts';
import { listOrders } from '../../../services/orders/list.ts';
import { privateResponse } from '../../../services/storefront/cache.ts';
import {
  clearCustomerSessionCookie,
  createCustomerSession,
  customerSessionIdFromRequest,
  destroyCustomerSession,
  getCustomerSession,
  setCustomerSessionCookie,
} from '../../../services/storefront/customer-sessions.ts';

/** Login rate limit config, shared by login and register (both take a password). */
const loginRateLimit = {
  config: {
    rateLimit: { max: RATE_LIMITS.login.max, timeWindow: RATE_LIMITS.login.windowMs },
  },
};

const ADDRESS_INCLUDE = { addresses: { orderBy: { createdAt: 'asc' } } } as const;
type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof ADDRESS_INCLUDE }>;

/** Prisma row → the storefront contract. Never carries `passwordHash`. */
function toStorefrontCustomer(row: CustomerRow): StorefrontCustomer {
  const addresses = row.addresses.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company,
    address1: a.address1,
    address2: a.address2,
    city: a.city,
    province: a.province,
    provinceCode: a.provinceCode,
    country: a.country,
    countryCode: a.countryCode,
    zip: a.zip,
    phone: a.phone,
    isDefault: a.isDefault,
  }));
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    acceptsMarketing: row.acceptsMarketing,
    addresses,
    defaultAddress: addresses.find((a) => a.isDefault) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toStorefrontOrder(order: OrderSummary): StorefrontOrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    total: order.total,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    cancelledAt: order.cancelledAt,
    itemCount: order.lineItems.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/**
 * The logged-in customer's id, or 401. Checks the session's shopId against the
 * Host-resolved shop: a session minted on one storefront presented on another
 * is invalid there, even though the signature verifies — customer sessions are
 * per-shop.
 */
async function requireCustomer(request: FastifyRequest): Promise<string> {
  const sessionId = customerSessionIdFromRequest(request);
  if (!sessionId) throw unauthorized('Sign in to continue.');

  const session = await getCustomerSession(sessionId);
  if (!session || session.shopId !== requireShop(request)) {
    throw unauthorized('Your session has expired. Sign in again.');
  }
  return session.customerId;
}

async function customerResponse(request: FastifyRequest, customerId: string) {
  const row = await request.db.customer.findFirst({
    where: { id: customerId },
    include: ADDRESS_INCLUDE,
  });
  // The row can be gone while the session lives — a merchant deleted the
  // customer from the admin. That is a signed-out shopper, not a server error.
  if (!row) throw unauthorized('Your session is no longer valid. Sign in again.');
  return storefrontCustomerResponse.parse({ customer: toStorefrontCustomer(row) });
}

async function signIn(reply: FastifyReply, shopId: string, customerId: string): Promise<void> {
  const sessionId = await createCustomerSession({ shopId, customerId });
  setCustomerSessionCookie(reply, sessionId);
}

export default async function routes(app: FastifyInstance) {
  // One shopper's account and orders must never come out of a shared cache.
  app.addHook('onSend', async (_request, reply) => {
    privateResponse(reply);
  });

  /* -------------------------------------------------------------- register */
  app.post('/register', loginRateLimit, async (request, reply) => {
    const input = customerRegisterInput.parse(request.body);
    const shopId = requireShop(request);

    // C4's seam: finds the guest row for this email or creates one — so a
    // shopper who ordered as a guest claims their history by registering.
    const { id } = await findOrCreateByEmail(request.db, shopId, {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      acceptsMarketing: input.acceptsMarketing,
    });

    const existing = await request.db.customer.findFirst({
      where: { id },
      select: { passwordHash: true },
    });
    if (existing?.passwordHash) {
      throw conflict('An account with this email already exists. Sign in instead.', 'email');
    }

    await request.db.customer.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(input.password),
        // A guest row has no name; a register form may. Never blank a name the
        // row already has — the admin may know more than the signup form.
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.acceptsMarketing !== undefined
          ? { acceptsMarketing: input.acceptsMarketing }
          : {}),
      },
    });

    // Registering signs you in, like the admin's signup (SPEC §8).
    await signIn(reply, shopId, id);
    return reply.status(201).send(await customerResponse(request, id));
  });

  /* ----------------------------------------------------------------- login */
  app.post('/login', loginRateLimit, async (request, reply) => {
    const input = customerLoginInput.parse(request.body);

    // request.db is Host-scoped, so the same email on another shop is simply
    // not found here — customer accounts are per-shop by construction.
    const customer = await request.db.customer.findFirst({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true, passwordHash: true },
    });

    // A guest row (passwordHash null) fails like an unknown email, and
    // verifyPassword burns the same argon2 work either way, so login does not
    // become a "who has an account here" oracle.
    const passwordOk = await verifyPassword(customer?.passwordHash, input.password);
    if (!customer || !passwordOk) throw unauthorized('Incorrect email or password.');

    await signIn(reply, requireShop(request), customer.id);
    return customerResponse(request, customer.id);
  });

  /* ---------------------------------------------------------------- logout */
  // Signing out of a dead session succeeds — same contract as staff logout.
  app.post('/logout', async (request, reply) => {
    const sessionId = customerSessionIdFromRequest(request);
    if (sessionId) await destroyCustomerSession(sessionId);
    clearCustomerSessionCookie(reply);
    return reply.status(204).send();
  });

  /* -------------------------------------------------------------------- me */
  app.get('/me', async (request) => {
    const customerId = await requireCustomer(request);
    return customerResponse(request, customerId);
  });

  app.put('/me', async (request) => {
    const customerId = await requireCustomer(request);
    const input = updateStorefrontCustomerInput.parse(request.body);

    await request.db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.acceptsMarketing !== undefined
            ? { acceptsMarketing: input.acceptsMarketing }
            : {}),
        },
      });

      // "Edit = one simple form": the default address is updated in place, or
      // created if the customer has none. Other addresses (from past orders)
      // are left alone — C4's admin surface owns the full address book.
      if (input.defaultAddress) {
        const current = await tx.customerAddress.findFirst({
          where: { customerId, isDefault: true },
          select: { id: true },
        });
        const address = {
          firstName: input.defaultAddress.firstName,
          lastName: input.defaultAddress.lastName,
          company: input.defaultAddress.company,
          address1: input.defaultAddress.address1,
          address2: input.defaultAddress.address2,
          city: input.defaultAddress.city,
          province: input.defaultAddress.province,
          provinceCode: input.defaultAddress.provinceCode,
          country: input.defaultAddress.country,
          countryCode: input.defaultAddress.countryCode,
          zip: input.defaultAddress.zip,
          phone: input.defaultAddress.phone,
        };
        if (current) {
          await tx.customerAddress.update({ where: { id: current.id }, data: address });
        } else {
          await tx.customerAddress.create({
            data: {
              ...address,
              id: newId('address'),
              // Nested create under dbForShop is NOT auto-stamped (CLAUDE.md §9)
              // — and this is a top-level create on a related table anyway, so
              // the shopId is set explicitly.
              shopId: requireShop(request),
              customerId,
              isDefault: true,
            },
          });
        }
      }
    });

    return customerResponse(request, customerId);
  });

  /* ------------------------------------------------------------- me/orders */
  app.get('/me/orders', async (request) => {
    const customerId = await requireCustomer(request);
    // Parsed from the query for limit/cursor, then pinned to THIS customer —
    // a customerId in the query string must never widen the filter.
    const query = listOrdersQuery.parse(request.query);
    const page = await listOrders(request.db, { ...query, customerId });
    return storefrontCustomerOrdersResponse.parse({
      data: page.data.map(toStorefrontOrder),
      nextCursor: page.nextCursor,
    });
  });
}
