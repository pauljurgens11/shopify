/**
 * A2 — the mandatory, blocking tenancy isolation suite (SPEC §14.1).
 *
 * Two shops, and every way one could see or touch the other's rows: the HTTP
 * layer (list, get-by-id), then the `dbForShop` client itself on exactly the
 * operations people forget — `findUniqueOrThrow`, `update`, `delete`,
 * `updateMany`/`deleteMany`, `count`/`aggregate`/`groupBy`, `upsert`, nested
 * creates, and everything again inside `$transaction`, because most services
 * write through `db.$transaction` and the extension applying there was only
 * ever asserted in a prose note.
 *
 * Speed is a feature: this file is on the required PR path of every agent
 * (docs/PARALLEL-AGENTS.md §3), so it uses two tiny fixture shops and no seed.
 * If you make it slower than ~30s, you have slowed down every merge.
 *
 * If this file goes red, stop: cross-tenant bleed is the one unforgivable bug
 * (CLAUDE.md §6). Never skip or soften it to get a PR through.
 */
import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin, Prisma } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shopA: TestShop;
let shopB: TestShop;
let cookieA: string;
let cookieB: string;
let dbA: TenantClient;
let dbB: TenantClient;

/** Shop A's product, created through the real route so the HTTP layer is in the loop. */
let productA: { id: string; title: string; variants: Array<{ id: string }> };
/** Shop B's own product — B's reads must return THIS, not merely "nothing". */
let productB: { id: string };
let orderA: { id: string };
let customerA: { id: string };

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

/** Assert an async op dies with the given Prisma error code (P2025 = row not found). */
async function expectPrismaCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toSatisfy((error) => isPrismaError(error, code));
}

beforeAll(async () => {
  app = await buildTestApp();
  shopA = await createTestShop();
  shopB = await createTestShop();
  cookieA = await sessionCookie(app, { shopId: shopA.shopId, staffUserId: shopA.ownerId });
  cookieB = await sessionCookie(app, { shopId: shopB.shopId, staffUserId: shopB.ownerId });
  dbA = dbForShop(shopA.shopId);
  dbB = dbForShop(shopB.shopId);

  const createdA = await app.inject({
    method: 'POST',
    url: '/admin/api/products',
    headers: { cookie: cookieA, 'x-requested-with': CSRF_HEADER_VALUE },
    payload: {
      title: 'Shop A Jacket',
      variants: [{ price: { amount: 5000, currencyCode: 'USD' } }],
    },
  });
  expect(createdA.statusCode, createdA.body).toBe(201);
  productA = createdA.json();

  const createdB = await app.inject({
    method: 'POST',
    url: '/admin/api/products',
    headers: { cookie: cookieB, 'x-requested-with': CSRF_HEADER_VALUE },
    payload: {
      title: 'Shop B Kettle',
      variants: [{ price: { amount: 3000, currencyCode: 'USD' } }],
    },
  });
  expect(createdB.statusCode, createdB.body).toBe(201);
  productB = createdB.json();

  // Direct inserts keep this suite independent of the orders/customers routes
  // (the issue's landmine: never block the blocking suite on another stream).
  orderA = await dbA.order.create({
    data: { id: newId('order'), shopId: shopA.shopId, orderNumber: 999901, email: 'a@a.test' },
  });
  customerA = await dbA.customer.create({
    data: { id: newId('customer'), shopId: shopA.shopId, email: 'jane@a.test' },
  });
});

afterAll(async () => {
  // Orders/customers have no FK to Shop, so deleteTestShops cannot reach them.
  const where = { shopId: { in: [shopA.shopId, shopB.shopId] } };
  await dbAdmin.order.deleteMany({ where });
  await dbAdmin.customer.deleteMany({ where });
  await app.close();
  await deleteTestShops([shopA.shopId, shopB.shopId]);
});

/* -------------------------------------------------------------------------- */
/* HTTP layer                                                                  */
/* -------------------------------------------------------------------------- */

describe('HTTP layer', () => {
  it('lists only the session shop’s rows', async () => {
    const listB = await app.inject({
      method: 'GET',
      url: '/admin/api/products',
      headers: { cookie: cookieB },
    });
    expect(listB.statusCode).toBe(200);
    const ids = listB.json().data.map((p: { id: string }) => p.id);
    expect(ids).toContain(productB.id);
    expect(ids).not.toContain(productA.id);

    const ordersB = await app.inject({
      method: 'GET',
      url: '/admin/api/orders',
      headers: { cookie: cookieB },
    });
    expect(ordersB.statusCode).toBe(200);
    expect(ordersB.json().data).toEqual([]);
  });

  it('keeps customers and orders invisible across the fence — list and get (SPEC §14.1)', async () => {
    const customersB = await app.inject({
      method: 'GET',
      url: '/admin/api/customers',
      headers: { cookie: cookieB },
    });
    expect(customersB.statusCode).toBe(200);
    const customerIds = customersB.json().data.map((c: { id: string }) => c.id);
    expect(customerIds).not.toContain(customerA.id);

    const customerGet = await app.inject({
      method: 'GET',
      url: `/admin/api/customers/${customerA.id}`,
      headers: { cookie: cookieB },
    });
    expect(customerGet.statusCode).toBe(404);

    const orderGet = await app.inject({
      method: 'GET',
      url: `/admin/api/orders/${orderA.id}`,
      headers: { cookie: cookieB },
    });
    expect(orderGet.statusCode).toBe(404);
  });

  it('404s a get-by-id across the fence, in the SPEC error shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/admin/api/products/${productA.id}`,
      headers: { cookie: cookieB },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().errors[0].code).toBe('not_found');

    // And the reverse: A cannot read B either — isolation is symmetric.
    const reverse = await app.inject({
      method: 'GET',
      url: `/admin/api/products/${productB.id}`,
      headers: { cookie: cookieA },
    });
    expect(reverse.statusCode).toBe(404);
  });

  it('404s a cross-tenant write without touching the row', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/admin/api/products/${productA.id}`,
      headers: { cookie: cookieB, 'x-requested-with': CSRF_HEADER_VALUE },
      payload: { title: 'Hijacked' },
    });
    expect(response.statusCode).toBe(404);

    const row = await dbAdmin.product.findUnique({ where: { id: productA.id } });
    expect(row?.title).toBe('Shop A Jacket');
  });
});

/* -------------------------------------------------------------------------- */
/* Client layer — the extension itself                                         */
/* -------------------------------------------------------------------------- */

describe('reads', () => {
  it('scopes findMany / findUnique / findFirst', async () => {
    const ids = (await dbB.product.findMany()).map((p) => p.id);
    expect(ids).toContain(productB.id);
    expect(ids).not.toContain(productA.id);

    expect(await dbB.product.findUnique({ where: { id: productA.id } })).toBeNull();
    expect(await dbB.order.findFirst({ where: { id: orderA.id } })).toBeNull();
    expect(await dbB.customer.findMany()).toEqual([]);
  });

  it('scopes the OrThrow variants', async () => {
    await expectPrismaCode(dbB.product.findUniqueOrThrow({ where: { id: productA.id } }), 'P2025');
    await expectPrismaCode(dbB.order.findFirstOrThrow({ where: { id: orderA.id } }), 'P2025');
  });

  it('scopes count, aggregate and groupBy', async () => {
    expect(await dbB.order.count()).toBe(0);
    expect(await dbA.order.count()).toBe(1);

    const sum = await dbB.productVariant.aggregate({ _sum: { price: true } });
    expect(sum._sum.price).toBe(3000); // B's kettle only, never A's 5000 jacket

    const groups = await dbB.product.groupBy({ by: ['status'], _count: true });
    const total = groups.reduce((n, g) => n + g._count, 0);
    expect(total).toBe(1);
  });

  it('scopes the Shop model to the tenant itself', async () => {
    const shops = await dbB.shop.findMany();
    expect(shops.map((s) => s.id)).toEqual([shopB.shopId]);
    expect(await dbB.shop.findUnique({ where: { id: shopA.shopId } })).toBeNull();
  });
});

describe('writes', () => {
  it('update by another shop’s id throws P2025 and leaves the row unchanged', async () => {
    await expectPrismaCode(
      dbB.product.update({ where: { id: productA.id }, data: { title: 'Stolen' } }),
      'P2025',
    );
    const row = await dbAdmin.product.findUnique({ where: { id: productA.id } });
    expect(row?.title).toBe('Shop A Jacket');
  });

  it('delete by another shop’s id throws P2025 and the row survives', async () => {
    await expectPrismaCode(dbB.customer.delete({ where: { id: customerA.id } }), 'P2025');
    expect(await dbAdmin.customer.findUnique({ where: { id: customerA.id } })).not.toBeNull();
  });

  it('updateMany / deleteMany with an empty where stop at the fence', async () => {
    // The most dangerous shape there is: `where: {}` — "everything".
    const updated = await dbB.product.updateMany({ data: { vendor: 'B Corp' } });
    expect(updated.count).toBe(1);
    const rowA = await dbAdmin.product.findUnique({ where: { id: productA.id } });
    expect(rowA?.vendor).toBeNull();

    const deleted = await dbB.order.deleteMany({});
    expect(deleted.count).toBe(0);
    expect(await dbAdmin.order.findUnique({ where: { id: orderA.id } })).not.toBeNull();
  });

  it('upsert against another shop’s unique key cannot write it', async () => {
    // The documented rough edge (tenant.ts): the scoped upsert sees no row,
    // falls through to create, and dies on the id’s unique index — P2002, not
    // a hijacked update. Ugly error, zero bleed.
    await expectPrismaCode(
      dbB.product.upsert({
        where: { id: productA.id },
        create: { id: productA.id, shopId: shopB.shopId, title: 'Clash', handle: 'clash' },
        update: { title: 'Hijacked' },
      }),
      'P2002',
    );
    const row = await dbAdmin.product.findUnique({ where: { id: productA.id } });
    expect(row?.title).toBe('Shop A Jacket');
    expect(row?.shopId).toBe(shopA.shopId);
  });

  it('refuses to create Shop rows — a scoped client cannot mint tenants', async () => {
    await expect(
      dbA.shop.create({
        data: { id: newId('shop'), slug: `evil-${Date.now()}`, name: 'Evil', email: 'e@e.test' },
      }),
    ).rejects.toThrow(/dbAdmin/);
  });

  it('overrides a caller-supplied foreign shopId, top-level and nested', async () => {
    // Prisma’s types force shopId into every create; the extension must make
    // the VALUE irrelevant — including inside a nested create, where a wrong
    // tenant would dodge every list query and surface only in the storefront.
    const created = await dbB.product.create({
      data: {
        id: newId('product'),
        shopId: shopA.shopId, // wrong on purpose
        title: 'Stamped',
        handle: `stamped-${newId('product').slice(-6).toLowerCase()}`,
        variants: {
          create: [
            {
              id: newId('variant'),
              shopId: shopA.shopId, // wrong on purpose
              title: 'Default Title',
              price: 1000,
            },
          ],
        },
      },
      include: { variants: true },
    });
    expect(created.shopId).toBe(shopB.shopId);
    expect(created.variants[0]?.shopId).toBe(shopB.shopId);
  });
});

describe('inside $transaction', () => {
  // Every multi-step service write goes through db.$transaction — if the
  // extension silently stopped applying there on a Prisma bump, none of the
  // tests above would notice. This one would.
  it('keeps scoping reads and writes', async () => {
    const seen = await dbB.$transaction(async (tx) => {
      const products = await tx.product.findMany();
      const orders = await tx.order.count();
      return { productIds: products.map((p) => p.id), orders };
    });
    expect(seen.productIds).not.toContain(productA.id);
    expect(seen.orders).toBe(0);

    await expect(
      dbB.$transaction(async (tx) =>
        tx.product.update({ where: { id: productA.id }, data: { title: 'Stolen in tx' } }),
      ),
    ).rejects.toSatisfy((error) => isPrismaError(error, 'P2025'));
    const row = await dbAdmin.product.findUnique({ where: { id: productA.id } });
    expect(row?.title).toBe('Shop A Jacket');
  });
});
