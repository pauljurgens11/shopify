/**
 * Payment router — the rest of the mandatory SPEC §14.2 suite.
 *
 * These run against a real Postgres (CI starts one; locally `docker compose
 * up -d`), because the three things most worth proving here are all
 * persistence: that an idempotency key really does dedupe against the unique
 * index, that a failed attempt still writes a Payment row, and that refunds cap
 * against the sum of PaymentRefund rows rather than a counter we keep in our
 * heads. The processors themselves are injected, so nothing here touches a
 * network.
 *
 * The one test to read first is "a decline is never retried on the next
 * processor". Cascading a decline double-charges customers and gets a platform
 * flagged for card testing; it is the single most important assertion in this
 * package.
 */
import { newId } from '@merchant/config/ids';
import type { AuthResult, ProcessorResult } from '@merchant/contracts/pay';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessorAdapter } from './adapter.ts';
import { mockAdapter, resetMockProcessor } from './adapters/mock.ts';
import { TEST_CARDS } from './adapters/test-cards.ts';
import { sealCredentials } from './credentials.ts';
import {
  capturePayment,
  charge,
  chargeSavedCard,
  PaymentError,
  refundPayment,
  savePaymentMethod,
  voidPayment,
} from './router.ts';
import { tokenizeCard } from './vault.ts';

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

let shopId: string;
let db: TenantClient;
const createdShops: string[] = [];

/** Every attempt any adapter saw this test, in order. */
let calls: string[] = [];

/** An adapter that always does one thing — the failover sequencing probe. */
function stubAdapter(key: 'mock' | 'stripe' | 'maverick', outcome: AuthResult['outcome']) {
  const adapter: ProcessorAdapter = {
    key,
    authorize: (req) => {
      calls.push(key);
      if (outcome === 'approved') {
        return Promise.resolve({
          outcome: 'approved',
          processor: key,
          processorTxnId: `${key}_txn_1`,
          captured: req.capture,
          amount: req.amount,
        });
      }
      if (outcome === 'declined') {
        return Promise.resolve({
          outcome: 'declined',
          processor: key,
          code: 'declined',
          message: 'Your card was declined.',
          processorTxnId: null,
        });
      }
      return Promise.resolve({
        outcome: 'hard_failure',
        processor: key,
        message: 'Simulated outage.',
        retryable: true,
      });
    },
    capture: (txnId, amount) =>
      Promise.resolve<ProcessorResult>({
        outcome: 'success',
        processor: key,
        processorTxnId: txnId,
        amount,
      }),
    refund: (txnId, amount) =>
      Promise.resolve<ProcessorResult>({
        outcome: 'success',
        processor: key,
        processorTxnId: `${txnId}_ref`,
        amount,
      }),
    voidAuth: (txnId) =>
      Promise.resolve<ProcessorResult>({
        outcome: 'success',
        processor: key,
        processorTxnId: txnId,
      }),
    verifyCredentials: () => Promise.resolve(true),
  };
  return adapter;
}

/** Resolver form the router accepts, built from a per-processor map. */
const adaptersOf = (map: Partial<Record<string, ProcessorAdapter>>) => (key: string) => {
  const adapter = map[key];
  if (!adapter) throw new Error(`test did not register an adapter for ${key}`);
  return adapter;
};

async function connectProcessor(
  processor: 'mock' | 'stripe' | 'maverick',
  options: { enabled?: boolean; position?: number; weight?: number; conditions?: unknown } = {},
): Promise<string> {
  // Idempotent: several helpers connect the same processor, and
  // ProcessorConfig is unique on (shopId, processor).
  const already = await db.processorConfig.findFirst({ where: { processor } });
  if (already) return already.id;

  const id = newId('processor');
  const sealed = sealCredentials({ secretKey: 'sk_test_x' });
  await db.processorConfig.create({
    data: {
      id,
      shopId,
      processor,
      displayName: processor,
      enabled: options.enabled ?? true,
      encryptedCredentials: sealed.ciphertext,
      credentialsIv: sealed.iv,
      credentialsAuthTag: sealed.authTag,
    },
  });
  if (options.position !== undefined) {
    await db.routingRule.create({
      data: {
        id: newId('routingRule'),
        shopId,
        processorConfigId: id,
        position: options.position,
        weight: options.weight ?? 100,
        conditions: (options.conditions ?? {}) as never,
      },
    });
  }
  return id;
}

async function tokenFor(number: string): Promise<string> {
  const token = await tokenizeCard(db, shopId, {
    number,
    expMonth: 12,
    expYear: new Date().getUTCFullYear() + 3,
    cvc: '123',
  });
  return token.cardTokenId;
}

let keySeq = 0;
const key = () => `idem_router_${Date.now()}_${++keySeq}`;

beforeEach(async () => {
  resetMockProcessor();
  calls = [];
  shopId = newId('shop');
  createdShops.push(shopId);
  await dbAdmin.shop.create({
    data: {
      id: shopId,
      slug: `pay-${shopId.slice(-10).toLowerCase()}`,
      name: 'Router test',
      email: 'o@t.test',
    },
  });
  db = dbForShop(shopId);
});

afterAll(async () => {
  const where = { shopId: { in: createdShops } };
  await dbAdmin.paymentRefund.deleteMany({ where });
  await dbAdmin.payment.deleteMany({ where });
  await dbAdmin.routingRule.deleteMany({ where });
  await dbAdmin.processorConfig.deleteMany({ where });
  await dbAdmin.paymentMethod.deleteMany({ where });
  await dbAdmin.vaultCard.deleteMany({ where });
  await dbAdmin.shop.deleteMany({ where: { id: { in: createdShops } } });
});

describe('charge — the no-cascade rule', () => {
  it('never retries a decline on the next processor', async () => {
    await connectProcessor('mock', { position: 0, weight: 100 });
    await connectProcessor('stripe', { position: 1, weight: 0 });

    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.declined),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      {
        rng: () => 0,
        adapters: adaptersOf({
          mock: stubAdapter('mock', 'declined'),
          stripe: stubAdapter('stripe', 'approved'),
        }),
      },
    );

    expect(calls).toEqual(['mock']);
    expect(payment.status).toBe('failed');
    expect(payment.errorCode).toBe('declined');
    expect(payment.routingTrail).toEqual([{ processor: 'mock', outcome: 'declined' }]);
  });

  it('does retry a hard failure, and records both hops in the routing trail', async () => {
    await connectProcessor('mock', { position: 0, weight: 100 });
    await connectProcessor('stripe', { position: 1, weight: 0 });

    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      {
        rng: () => 0,
        adapters: adaptersOf({
          mock: stubAdapter('mock', 'hard_failure'),
          stripe: stubAdapter('stripe', 'approved'),
        }),
      },
    );

    expect(calls).toEqual(['mock', 'stripe']);
    expect(payment.status).toBe('captured');
    expect(payment.processor).toBe('stripe');
    expect(payment.routingTrail).toEqual([
      { processor: 'mock', outcome: 'hard_failure' },
      { processor: 'stripe', outcome: 'approved' },
    ]);
  });

  it('stops as failed when every processor in the chain hard-fails', async () => {
    await connectProcessor('mock', { position: 0, weight: 100 });
    await connectProcessor('stripe', { position: 1, weight: 0 });

    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      {
        rng: () => 0,
        adapters: adaptersOf({
          mock: stubAdapter('mock', 'hard_failure'),
          stripe: stubAdapter('stripe', 'hard_failure'),
        }),
      },
    );

    expect(calls).toEqual(['mock', 'stripe']);
    expect(payment.status).toBe('failed');
    expect(payment.routingTrail).toHaveLength(2);
  });
});

describe('charge — persistence', () => {
  it('writes a Payment row for a failure too, so the order page can show the attempt', async () => {
    await connectProcessor('mock', { position: 0 });
    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.insufficientFunds),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );

    const row = await db.payment.findUnique({ where: { id: payment.id } });
    expect(row).toMatchObject({ status: 'failed', errorCode: 'insufficient_funds', last4: '9995' });
  });

  it('records the card metadata but never the number', async () => {
    await connectProcessor('mock', { position: 0 });
    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );

    expect(payment).toMatchObject({ last4: '4242', brand: 'visa', status: 'captured' });
    expect(JSON.stringify(payment)).not.toContain(TEST_CARDS.approved);
  });

  it('authorizes without capturing when capture is false', async () => {
    await connectProcessor('mock', { position: 0 });
    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        capture: false,
        idempotencyKey: key(),
      },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );
    expect(payment.status).toBe('authorized');
  });

  it('refuses to charge when the shop has connected no processor', async () => {
    await expect(
      charge(db, shopId, {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      }),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it('falls back to the enabled processors when no routing rule exists', async () => {
    await connectProcessor('mock');
    const payment = await charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );
    expect(payment.status).toBe('captured');
  });

  it('ignores a disabled processor', async () => {
    await connectProcessor('mock', { enabled: false, position: 0 });
    await expect(
      charge(db, shopId, {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount: usd(2500),
        idempotencyKey: key(),
      }),
    ).rejects.toBeInstanceOf(PaymentError);
  });
});

describe('charge — idempotency', () => {
  it('replaying a key returns the first Payment and never calls a processor again', async () => {
    await connectProcessor('mock', { position: 0 });
    const cardTokenId = await tokenFor(TEST_CARDS.approved);
    const idempotencyKey = key();
    const adapters = adaptersOf({ mock: stubAdapter('mock', 'approved') });

    const first = await charge(
      db,
      shopId,
      { cardTokenId, amount: usd(2500), idempotencyKey },
      { adapters },
    );
    const second = await charge(
      db,
      shopId,
      { cardTokenId, amount: usd(2500), idempotencyKey },
      { adapters },
    );

    expect(second.id).toBe(first.id);
    expect(calls).toEqual(['mock']);
    expect(await db.payment.count()).toBe(1);
  });
});

describe('capture, void and refund', () => {
  async function authorized(amount = usd(2500)) {
    await connectProcessor('mock', { position: 0 });
    return charge(
      db,
      shopId,
      {
        cardTokenId: await tokenFor(TEST_CARDS.approved),
        amount,
        capture: false,
        idempotencyKey: key(),
      },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );
  }

  const withMock = { adapters: adaptersOf({ mock: mockAdapter }) };

  it('captures an authorization exactly once', async () => {
    const payment = await authorized();
    const captured = await capturePayment(db, payment.id, undefined, withMock);
    expect(captured.status).toBe('captured');
    await expect(capturePayment(db, payment.id, undefined, withMock)).rejects.toBeInstanceOf(
      PaymentError,
    );
  });

  it('voids an authorization and refuses to void a captured payment', async () => {
    const payment = await authorized();
    expect((await voidPayment(db, payment.id, withMock)).status).toBe('voided');

    const other = await authorized();
    await capturePayment(db, other.id, undefined, withMock);
    await expect(voidPayment(db, other.id, withMock)).rejects.toBeInstanceOf(PaymentError);
  });

  it('caps two partial refunds at the captured amount', async () => {
    const payment = await authorized(usd(2500));
    await capturePayment(db, payment.id, undefined, withMock);

    const first = await refundPayment(
      db,
      shopId,
      payment.id,
      { amount: usd(1000), idempotencyKey: key() },
      withMock,
    );
    expect(first.status).toBe('partially_refunded');
    expect(first.refundedAmount).toEqual(usd(1000));

    const second = await refundPayment(
      db,
      shopId,
      payment.id,
      { amount: usd(1500), idempotencyKey: key() },
      withMock,
    );
    expect(second.status).toBe('refunded');
    expect(second.refundedAmount).toEqual(usd(2500));

    await expect(
      refundPayment(db, shopId, payment.id, { amount: usd(1), idempotencyKey: key() }, withMock),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it('caps against the sum of refund rows, not against a single request', async () => {
    const payment = await authorized(usd(2500));
    await capturePayment(db, payment.id, undefined, withMock);
    await refundPayment(
      db,
      shopId,
      payment.id,
      { amount: usd(2000), idempotencyKey: key() },
      withMock,
    );

    await expect(
      refundPayment(db, shopId, payment.id, { amount: usd(600), idempotencyKey: key() }, withMock),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it('replaying a refund key does not refund twice', async () => {
    const payment = await authorized(usd(2500));
    await capturePayment(db, payment.id, undefined, withMock);
    const idempotencyKey = key();

    await refundPayment(db, shopId, payment.id, { amount: usd(1000), idempotencyKey }, withMock);
    const replay = await refundPayment(
      db,
      shopId,
      payment.id,
      { amount: usd(1000), idempotencyKey },
      withMock,
    );

    expect(replay.refundedAmount).toEqual(usd(1000));
    expect(await db.paymentRefund.count({ where: { paymentId: payment.id } })).toBe(1);
  });

  it('refuses to refund an authorization that was never captured', async () => {
    const payment = await authorized();
    await expect(
      refundPayment(db, shopId, payment.id, { amount: usd(100), idempotencyKey: key() }, withMock),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it('leaves the payment untouched when the processor refuses the refund', async () => {
    const payment = await authorized(usd(2500));
    await capturePayment(db, payment.id, undefined, withMock);

    const refusing = stubAdapter('mock', 'approved');
    refusing.refund = () =>
      Promise.resolve({
        outcome: 'failure',
        processor: 'mock',
        message: 'Processor said no.',
        retryable: false,
      });

    await expect(
      refundPayment(
        db,
        shopId,
        payment.id,
        { amount: usd(1000), idempotencyKey: key() },
        { adapters: adaptersOf({ mock: refusing }) },
      ),
    ).rejects.toBeInstanceOf(PaymentError);

    const row = await db.payment.findUnique({ where: { id: payment.id } });
    expect(row).toMatchObject({ status: 'captured', refundedAmount: 0 });
    expect(await db.paymentRefund.count({ where: { paymentId: payment.id } })).toBe(0);
  });
});

describe('saved cards — the repeat-billing primitive', () => {
  it('charges a saved card through the same router', async () => {
    await connectProcessor('mock', { position: 0 });
    const customerId = newId('customer');
    await dbAdmin.customer.create({
      data: { id: customerId, shopId, email: `c-${customerId}@t.test` },
    });

    const method = await savePaymentMethod(
      db,
      shopId,
      customerId,
      await tokenFor(TEST_CARDS.approved),
    );
    expect(method).toMatchObject({ brand: 'visa', last4: '4242', isDefault: true });

    const payment = await chargeSavedCard(
      db,
      shopId,
      { paymentMethodId: method.id, amount: usd(4999), idempotencyKey: key() },
      { adapters: adaptersOf({ mock: mockAdapter }) },
    );
    expect(payment).toMatchObject({ status: 'captured', last4: '4242' });
  });
});
