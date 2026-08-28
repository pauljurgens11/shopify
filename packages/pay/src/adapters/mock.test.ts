/**
 * Mock adapter — part of the mandatory SPEC §14.2 Pay suite.
 *
 * The card numbers are written out as literals on purpose: they are a published
 * contract that the seed, the checkout demo and the Playwright smoke suite all
 * type in by hand. A test that read them from a constant would happily follow a
 * typo into the constant.
 */
import type { AuthorizeRequest } from '@merchant/contracts/pay';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardMaterial } from '../adapter.ts';
import type { VaultedCard } from '../vault.ts';
import { mockAdapter, resetMockProcessor } from './mock.ts';

const APPROVED = '4242424242424242';
const DECLINED = '4000000000000002';
const INSUFFICIENT = '4000000000009995';
const HARD_FAILURE = '4000000000000119';

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

const card = (number: string): CardMaterial => ({
  number,
  cvc: '123',
  brand: 'visa',
  last4: number.slice(-4),
  expMonth: 12,
  expYear: 2030,
});

let keySeq = 0;
const req = (over: Partial<AuthorizeRequest> = {}): AuthorizeRequest => ({
  cardTokenId: 'card_tok_01JTESTTESTTESTTESTTESTTEST',
  amount: usd(2500),
  capture: true,
  idempotencyKey: `idem_test_${++keySeq}`,
  ...over,
});

/** Authorize (no auto-capture) and return the txn id, failing loudly if declined. */
async function authorizeOnly(number = APPROVED, amount = usd(2500)): Promise<string> {
  const result = await mockAdapter.authorize(req({ amount, capture: false }), card(number), {});
  if (result.outcome !== 'approved') throw new Error(`expected approval, got ${result.outcome}`);
  return result.processorTxnId;
}

beforeEach(() => {
  resetMockProcessor();
});

describe('mockAdapter.authorize', () => {
  it('maps the four SPEC test cards onto exactly the four outcomes', async () => {
    const approved = await mockAdapter.authorize(req(), card(APPROVED), {});
    expect(approved).toMatchObject({
      outcome: 'approved',
      processor: 'mock',
      captured: true,
      amount: usd(2500),
    });
    expect(approved.outcome === 'approved' && approved.processorTxnId).toMatch(/^mock_/);

    const declined = await mockAdapter.authorize(req(), card(DECLINED), {});
    expect(declined).toMatchObject({ outcome: 'declined', code: 'declined' });

    const insufficient = await mockAdapter.authorize(req(), card(INSUFFICIENT), {});
    expect(insufficient).toMatchObject({ outcome: 'declined', code: 'insufficient_funds' });

    const hardFailure = await mockAdapter.authorize(req(), card(HARD_FAILURE), {});
    expect(hardFailure).toMatchObject({ outcome: 'hard_failure', retryable: true });
  });

  it('never reports a decline as a hard failure — a cascaded decline double-charges (SPEC §11)', async () => {
    for (const number of [DECLINED, INSUFFICIENT]) {
      const result = await mockAdapter.authorize(req(), card(number), {});
      expect(result.outcome).toBe('declined');
    }
  });

  it('approves any other card so the seeded demo and hand-typed cards work', async () => {
    const result = await mockAdapter.authorize(req(), card('5555555555554444'), {});
    expect(result.outcome).toBe('approved');
  });

  it('records capture:false as an authorization, not a capture', async () => {
    const result = await mockAdapter.authorize(req({ capture: false }), card(APPROVED), {});
    expect(result).toMatchObject({ outcome: 'approved', captured: false });
  });

  it('replaying an idempotency key returns the first result instead of a second charge', async () => {
    const key = 'idem_replay_0001';
    const first = await mockAdapter.authorize(req({ idempotencyKey: key }), card(APPROVED), {});
    const second = await mockAdapter.authorize(req({ idempotencyKey: key }), card(APPROVED), {});
    expect(second).toEqual(first);
  });

  it('does not replay across a key collision — two shops can pick the same key', async () => {
    // idempotencyKey is a caller-supplied string with no shop in it, and the
    // ledger is process-global. A bare key lookup would hand the second shop
    // the first shop's approval, transaction id included.
    const key = 'order-1001';
    const shopA = await mockAdapter.authorize(
      req({ idempotencyKey: key, amount: usd(2500) }),
      card(APPROVED),
      {},
    );
    const shopB = await mockAdapter.authorize(
      req({ idempotencyKey: key, amount: usd(9900) }),
      card('5555555555554444'),
      {},
    );
    expect(shopB).toMatchObject({ outcome: 'approved', amount: usd(9900) });
    expect(shopB.outcome === 'approved' && shopA.outcome === 'approved').toBe(true);
    if (shopA.outcome === 'approved' && shopB.outcome === 'approved') {
      expect(shopB.processorTxnId).not.toBe(shopA.processorTxnId);
    }
  });

  it('does not memoize a hard failure — the retry that follows it must reach the processor', async () => {
    const key = 'idem_hardfail_0001';
    const first = await mockAdapter.authorize(req({ idempotencyKey: key }), card(HARD_FAILURE), {});
    expect(first.outcome).toBe('hard_failure');
    const retry = await mockAdapter.authorize(req({ idempotencyKey: key }), card(APPROVED), {});
    expect(retry.outcome).toBe('approved');
  });
});

describe('mockAdapter.capture', () => {
  it('captures an authorization once', async () => {
    const txnId = await authorizeOnly();
    await expect(mockAdapter.capture(txnId, usd(2500), {})).resolves.toMatchObject({
      outcome: 'success',
      processorTxnId: txnId,
      amount: usd(2500),
    });
    await expect(mockAdapter.capture(txnId, usd(2500), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });

  it('fails cleanly on an unknown transaction instead of throwing', async () => {
    await expect(mockAdapter.capture('mock_nope', usd(100), {})).resolves.toMatchObject({
      outcome: 'failure',
      retryable: false,
    });
  });

  it('refuses to capture more than was authorized', async () => {
    const txnId = await authorizeOnly(APPROVED, usd(2500));
    await expect(mockAdapter.capture(txnId, usd(2501), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });

  it('supports partial capture', async () => {
    const txnId = await authorizeOnly(APPROVED, usd(2500));
    await expect(mockAdapter.capture(txnId, usd(1000), {})).resolves.toMatchObject({
      outcome: 'success',
      amount: usd(1000),
    });
  });
});

describe('mockAdapter.refund', () => {
  it('adopts a transaction from a previous process, because the seed writes those', async () => {
    // `pnpm seed` writes captured Payment rows carrying processorTxnIds this
    // process never issued, and the ledger is per-process. Rejecting them made
    // the admin's Refund button fail on every seeded order. The Payment row is
    // the authority on the amount, and refundPayment has already capped against
    // it before an adapter is reached — so an adopted txn stays refundable
    // rather than being held to a ceiling we would have to invent.
    await expect(mockAdapter.refund('mock_ch_1040', usd(6400), {})).resolves.toMatchObject({
      outcome: 'success',
    });
    await expect(mockAdapter.refund('mock_ch_1040', usd(3000), {})).resolves.toMatchObject({
      outcome: 'success',
    });
  });

  it('accumulates partial refunds and rejects the one that exceeds the captured amount', async () => {
    const txnId = await authorizeOnly();
    await mockAdapter.capture(txnId, usd(2500), {});

    await expect(mockAdapter.refund(txnId, usd(1000), {})).resolves.toMatchObject({
      outcome: 'success',
    });
    await expect(mockAdapter.refund(txnId, usd(1500), {})).resolves.toMatchObject({
      outcome: 'success',
    });
    await expect(mockAdapter.refund(txnId, usd(1), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });

  it('rejects a refund larger than the capture', async () => {
    const txnId = await authorizeOnly();
    await mockAdapter.capture(txnId, usd(1000), {});
    await expect(mockAdapter.refund(txnId, usd(2500), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });

  it('refuses to refund an authorization that was never captured', async () => {
    const txnId = await authorizeOnly();
    await expect(mockAdapter.refund(txnId, usd(100), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });
});

describe('mockAdapter.voidAuth', () => {
  it('voids an uncaptured authorization', async () => {
    const txnId = await authorizeOnly();
    await expect(mockAdapter.voidAuth(txnId, {})).resolves.toMatchObject({ outcome: 'success' });
  });

  it('refuses to void after capture, and refuses to capture after void', async () => {
    const captured = await authorizeOnly();
    await mockAdapter.capture(captured, usd(2500), {});
    await expect(mockAdapter.voidAuth(captured, {})).resolves.toMatchObject({
      outcome: 'failure',
    });

    const voided = await authorizeOnly();
    await mockAdapter.voidAuth(voided, {});
    await expect(mockAdapter.capture(voided, usd(2500), {})).resolves.toMatchObject({
      outcome: 'failure',
    });
  });
});

describe('the vault → adapter seam', () => {
  it('accepts a VaultedCard as-is, which is what the router (D3) will hand it', async () => {
    // Compile-time proof that the two halves of packages/pay still fit: getCard
    // returns VaultedCard, authorize takes CardMaterial, and D3 passes one
    // straight to the other. If either side grows a required field, this breaks
    // here rather than at wiring time.
    const vaulted: VaultedCard = {
      number: APPROVED,
      cvc: '123',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
    };
    await expect(mockAdapter.authorize(req(), vaulted, {})).resolves.toMatchObject({
      outcome: 'approved',
    });
  });
});

describe('mockAdapter.verifyCredentials', () => {
  it('is always connected — the mock needs no credentials', async () => {
    await expect(mockAdapter.verifyCredentials({})).resolves.toBe(true);
  });
});
