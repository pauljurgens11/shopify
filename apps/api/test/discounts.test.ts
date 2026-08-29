/**
 * C6 — the discount CRUD routes behind the admin form.
 *
 * Scoped to where behaviour actually exists (SPEC §14 forbids per-endpoint CRUD
 * coverage): the unique-code rule, the fact that the form's payload survives a
 * round trip through contract validation, and the derived status the index
 * badge reads. The pricing math is C1's suite and is not repeated here.
 */
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { buildTestApp, createTestShop, deleteTestShops, sessionCookie } from './helpers.ts';

let app: FastifyInstance;
let shop: Awaited<ReturnType<typeof createTestShop>>;
let cookie: string;
const shopIds: string[] = [];

const CSRF = { 'x-requested-with': 'shopify-admin' };
const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

const get = (url: string) => app.inject({ method: 'GET', url, headers: { cookie } });
const send = (method: 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown) =>
  app.inject({ method, url, headers: { cookie, ...CSRF }, payload });

/** Exactly what the C6 discount form posts for H2 flow (c)'s WELCOME10 code. */
const welcome10 = {
  title: 'Welcome offer',
  code: 'WELCOME10',
  type: 'amount_off_order',
  valueType: 'percentage',
  value: 10,
  appliesTo: { scope: 'all' },
  minimumRequirement: { type: 'none' },
  usageLimit: null,
  oncePerCustomer: false,
  startsAt: iso(-1),
  endsAt: null,
};

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  shopIds.push(shop.shopId);
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  await dbAdmin.discountRedemption.deleteMany({ where: { shopId: { in: shopIds } } });
  await dbAdmin.discount.deleteMany({ where: { shopId: { in: shopIds } } });
  await deleteTestShops(shopIds);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

describe('POST /admin/api/discounts', () => {
  it('round-trips the form payload and reads it back unchanged', async () => {
    const created = await send('POST', '/admin/api/discounts', welcome10);
    expect(created.statusCode).toBe(201);

    const body = created.json();
    expect(body.id).toMatch(/^dis_/);
    expect(body).toMatchObject({
      title: 'Welcome offer',
      code: 'WELCOME10',
      type: 'amount_off_order',
      valueType: 'percentage',
      value: 10,
      usedCount: 0,
    });

    // What the index and the edit form will load has to equal what was posted —
    // a field dropped by the persistence layer shows up as a silently reset
    // control the next time the merchant opens the discount.
    const reloaded = await get(`/admin/api/discounts/${body.id}`);
    expect(reloaded.statusCode).toBe(200);
    expect(reloaded.json()).toEqual(body);
  });

  it('refuses a duplicate code in the SPEC error shape, ignoring case', async () => {
    await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'SUMMER20',
      title: 'Summer',
    });

    // Codes are matched case-insensitively at checkout (C1's engine lowercases
    // both sides), so `summer20` is the same coupon, not a second one.
    const duplicate = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'summer20',
      title: 'Summer again',
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      errors: [{ code: 'conflict', message: expect.any(String), field: 'code' }],
    });
  });

  it('lets two automatic discounts coexist, because neither has a code', async () => {
    const first = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: null,
      title: 'Automatic one',
    });
    const second = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: null,
      title: 'Automatic two',
    });
    expect([first.statusCode, second.statusCode]).toEqual([201, 201]);
  });
});

describe('discount status', () => {
  it('derives from the date window rather than a stored flag', async () => {
    // No cron flips these; the badge on the index is computed at read time.
    const scheduled = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'FUTURE',
      title: 'Starts next week',
      startsAt: iso(7),
    });
    const expired = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'PAST',
      title: 'Ended yesterday',
      startsAt: iso(-30),
      endsAt: iso(-1),
    });

    expect(scheduled.json().status).toBe('scheduled');
    expect(expired.json().status).toBe('expired');

    // And a row still STORED as scheduled reports active once its start time
    // has passed, with nothing having updated it — its own discount, so the
    // index assertions below stay independent of this one.
    const sleeper = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'SLEEPER',
      title: 'Wakes up on its own',
      startsAt: iso(7),
    });
    await dbAdmin.discount.update({
      where: { id: sleeper.json().id },
      data: { startsAt: new Date(Date.now() - 1000), status: 'scheduled' },
    });
    const reloaded = await get(`/admin/api/discounts/${sleeper.json().id}`);
    expect(reloaded.json().status).toBe('active');
  });

  it('filters the index by that derived status', async () => {
    const active = await get('/admin/api/discounts?status=active');
    expect(active.statusCode).toBe(200);
    const titles = active.json().data.map((d: { title: string }) => d.title);
    expect(titles).toContain('Welcome offer');
    expect(titles).not.toContain('Starts next week');
    expect(titles).not.toContain('Ended yesterday');
  });

  it('searches by title and by code', async () => {
    expect(
      (await get('/admin/api/discounts?query=welcome'))
        .json()
        .data.map((d: { code: string }) => d.code),
    ).toEqual(['WELCOME10']);
    expect(
      (await get('/admin/api/discounts?query=SUMMER20'))
        .json()
        .data.map((d: { code: string }) => d.code),
    ).toEqual(['SUMMER20']);
  });
});

describe('editing and deleting', () => {
  it('updates a discount and deletes it', async () => {
    const created = await send('POST', '/admin/api/discounts', {
      ...welcome10,
      code: 'TEMP15',
      title: 'Temporary',
    });
    const { id } = created.json();

    const updated = await send('PUT', `/admin/api/discounts/${id}`, {
      title: 'Renamed',
      value: 15,
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ title: 'Renamed', value: 15, code: 'TEMP15' });

    expect((await send('DELETE', `/admin/api/discounts/${id}`)).statusCode).toBe(200);
    expect((await get(`/admin/api/discounts/${id}`)).statusCode).toBe(404);
  });
});
