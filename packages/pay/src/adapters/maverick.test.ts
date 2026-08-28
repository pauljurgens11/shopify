/**
 * Maverick adapter (SPEC §14.2). Two things are worth testing here:
 *
 *   1. `mapMaverickAuthResponse` — the real logic. It turns Maverick's
 *      response-code vocabulary into the contract's `approved | declined |
 *      hard_failure`, and getting `96` (processor malfunction) confused with
 *      `05` (do not honor) is exactly the mistake that cascades a decline.
 *   2. Simulated mode is deterministic AND is a healthy processor, so the
 *      router's failover has somewhere to land.
 *
 * The shared authorize/capture/refund ledger is covered by mock.test.ts; it is
 * the same code, so it is not retested through this adapter.
 */
import type { AuthorizeRequest } from '@merchant/contracts/pay';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CardMaterial } from '../adapter.ts';
import {
  classifyMaverickStatus,
  type MaverickAuthResponse,
  mapMaverickAuthResponse,
  maverickAdapter,
  maverickMode,
  resetMaverickProcessor,
  toDecimalString,
} from './maverick.ts';

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
  idempotencyKey: `idem_mav_${++keySeq}`,
  ...over,
});

const response = (over: Partial<MaverickAuthResponse> = {}): MaverickAuthResponse => ({
  status: 'approved',
  transactionId: 'mav_txn_1',
  responseCode: '00',
  responseMessage: 'Approved',
  ...over,
});

beforeEach(() => {
  resetMaverickProcessor();
});

describe('mapMaverickAuthResponse', () => {
  it('maps an approval, echoing the amount we asked for', () => {
    expect(mapMaverickAuthResponse(response(), usd(2500), true)).toMatchObject({
      outcome: 'approved',
      processor: 'maverick',
      processorTxnId: 'mav_txn_1',
      captured: true,
      amount: usd(2500),
    });
  });

  it('reports capture:false as an authorization', () => {
    expect(mapMaverickAuthResponse(response(), usd(2500), false)).toMatchObject({
      outcome: 'approved',
      captured: false,
    });
  });

  it('maps issuer response codes onto the contract decline codes', () => {
    const declineFor = (responseCode: string) =>
      mapMaverickAuthResponse(
        response({ status: 'declined', responseCode, transactionId: null }),
        usd(2500),
        true,
      );

    expect(declineFor('51')).toMatchObject({ outcome: 'declined', code: 'insufficient_funds' });
    expect(declineFor('54')).toMatchObject({ outcome: 'declined', code: 'expired_card' });
    expect(declineFor('14')).toMatchObject({ outcome: 'declined', code: 'invalid_card' });
    expect(declineFor('05')).toMatchObject({ outcome: 'declined', code: 'declined' });
  });

  it('keeps an issuer outage a decline — the next processor reaches the same issuer', () => {
    expect(
      mapMaverickAuthResponse(
        response({ status: 'declined', responseCode: '91', transactionId: null }),
        usd(2500),
        true,
      ),
    ).toMatchObject({ outcome: 'declined', code: 'processing_error' });
  });

  it('maps a processor-side malfunction to hard_failure so the router can fail over', () => {
    expect(
      mapMaverickAuthResponse(
        response({ status: 'error', responseCode: '96', responseMessage: 'System malfunction' }),
        usd(2500),
        true,
      ),
    ).toMatchObject({ outcome: 'hard_failure', retryable: true });
  });

  it('treats an approval with no transaction id as a hard failure, not a silent approval', () => {
    expect(
      mapMaverickAuthResponse(response({ transactionId: null }), usd(2500), true),
    ).toMatchObject({ outcome: 'hard_failure' });
  });
});

describe('maverick simulated mode', () => {
  it('runs simulated without credentials and live with them', () => {
    expect(maverickMode({})).toBe('simulated');
    expect(maverickMode({ apiKey: 'k', merchantId: 'm' })).toBe('live');
    expect(maverickMode({ apiKey: 'k' })).toBe('simulated');
  });

  it('marks every simulated approval so nobody mistakes it for a real one', async () => {
    const result = await maverickAdapter.authorize(req(), card('4242424242424242'), {});
    expect(result).toMatchObject({ outcome: 'approved', processor: 'maverick' });
    expect(result.outcome === 'approved' && result.raw).toMatchObject({ simulated: true });
  });

  it('honours the SPEC decline cards', async () => {
    await expect(
      maverickAdapter.authorize(req(), card('4000000000000002'), {}),
    ).resolves.toMatchObject({ outcome: 'declined', code: 'declined' });
    await expect(
      maverickAdapter.authorize(req(), card('4000000000009995'), {}),
    ).resolves.toMatchObject({ outcome: 'declined', code: 'insufficient_funds' });
  });

  it('approves the card that hard-fails on mock, so failover has somewhere to land', async () => {
    await expect(
      maverickAdapter.authorize(req(), card('4000000000000119'), {}),
    ).resolves.toMatchObject({ outcome: 'approved' });
  });

  it('keeps the simulated marker on an idempotent replay', async () => {
    const key = 'idem_mav_replay_0001';
    const first = await maverickAdapter.authorize(
      req({ idempotencyKey: key }),
      card('4242424242424242'),
      {},
    );
    const replay = await maverickAdapter.authorize(
      req({ idempotencyKey: key }),
      card('4242424242424242'),
      {},
    );
    expect(replay).toEqual(first);
    expect(replay.outcome === 'approved' && replay.raw).toMatchObject({ simulated: true });
  });

  it('is usable without credentials — simulated is a working mode, not a broken one', async () => {
    await expect(maverickAdapter.verifyCredentials({})).resolves.toBe(true);
  });
});

describe('classifyMaverickStatus', () => {
  it('never lets a transport or credential status become a card answer', () => {
    // A revoked API key answers 401 to every request. If that read as a
    // decline, every customer would be told their card failed and no other
    // processor would ever be tried.
    for (const status of [401, 403, 408, 429, 500, 502, 503]) {
      expect(classifyMaverickStatus(status)).toMatchObject({ retryable: true });
    }
  });

  it('stops our own malformed request rather than repeating it elsewhere', () => {
    for (const status of [400, 404, 422]) {
      expect(classifyMaverickStatus(status)).toMatchObject({ retryable: false });
    }
  });
});

describe('toDecimalString', () => {
  it('renders minor units for the wire without ever touching a float', () => {
    expect(toDecimalString(usd(2500))).toBe('25.00');
    expect(toDecimalString(usd(5))).toBe('0.05');
    expect(toDecimalString(usd(100000))).toBe('1000.00');
    expect(toDecimalString(usd(-2500))).toBe('-25.00');
  });

  it('does not invent decimals for zero-decimal currencies', () => {
    expect(toDecimalString({ amount: 1000, currencyCode: 'JPY' })).toBe('1000');
  });
});
