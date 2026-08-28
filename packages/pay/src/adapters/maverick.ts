/**
 * `maverick` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Interface-complete against Maverick's documented request/response shapes, but
 * returns SIMULATED responses unless MAVERICK_* credentials are present
 * (SPEC §2 puts a real integration out of scope). Keep that clearly marked in
 * the admin UI so nobody mistakes a simulated approval for a real one — every
 * simulated approval carries `raw.simulated === true`, and `maverickMode(creds)`
 * is the check the settings screen should render a badge from.
 *
 * The request/response types below mirror the shapes Maverick documents for its
 * hosted transaction API. They have not been exercised against a live merchant
 * account; the live branch exists so that pasting real credentials is a config
 * change rather than a code change.
 *
 * Simulated mode deliberately approves the `…0119` outage card that `mock`
 * hard-fails on. That asymmetry is the whole point: it is what makes the
 * router's failover (mock hard-fails → maverick approves) demonstrable end to
 * end instead of just unit-tested.
 */

import { minorUnitFactor } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import type { AuthorizeRequest, AuthResult, ProcessorResult } from '@merchant/contracts/pay';
import type { CardMaterial, ProcessorAdapter, ProcessorCredentials } from '../adapter.ts';
import { SimulatedProcessor, simulatedLedger } from './simulated.ts';
import { classifyTestCard } from './test-cards.ts';

const DEFAULT_BASE_URL = 'https://api.maverickpayments.com';
const TIMEOUT_MS = 20_000;

/* --- wire shapes ----------------------------------------------------------- */

export interface MaverickCard {
  number: string;
  /** MMYY, as Maverick documents it. */
  expiration: string;
  cvv: string;
  cardholderName?: string;
}

export interface MaverickAuthRequest {
  merchantId: string;
  /** Major units as a decimal string ("25.00") — Maverick is not a minor-unit API. */
  amount: string;
  currency: string;
  capture: boolean;
  card: MaverickCard;
  orderId?: string;
  customerEmail?: string;
  billing?: {
    name?: string;
    address1: string;
    address2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export interface MaverickAuthResponse {
  status: 'approved' | 'declined' | 'error';
  transactionId: string | null;
  /** ISO 8583 style: '00' approved, '05' do not honor, '51' insufficient funds… */
  responseCode: string;
  responseMessage: string;
}

export interface MaverickTransactionResponse {
  status: 'approved' | 'declined' | 'error';
  transactionId: string | null;
  responseCode: string;
  responseMessage: string;
}

/* --- response mapping (the real logic) ------------------------------------- */

/**
 * Maverick's response vocabulary → the contract's three outcomes.
 *
 * The line that matters: `error` (the processor itself fell over) is the only
 * thing that becomes `hard_failure`. Every issuer answer — including `91`
 * "issuer unavailable", which looks retryable — stays a decline, because the
 * next processor in the chain reaches the very same issuer.
 */
export function mapMaverickAuthResponse(
  res: MaverickAuthResponse,
  amount: MoneyDto,
  capture: boolean,
): AuthResult {
  if (res.status === 'error' || isProcessorFault(res.responseCode)) {
    return {
      outcome: 'hard_failure',
      processor: 'maverick',
      message: res.responseMessage || 'Maverick could not process the transaction.',
      retryable: true,
    };
  }

  if (res.status === 'approved') {
    if (!res.transactionId) {
      // An approval we cannot reference is not an approval — we would have no
      // id to capture, refund or void against.
      return {
        outcome: 'hard_failure',
        processor: 'maverick',
        message: 'Maverick approved the transaction without returning a transaction id.',
        retryable: true,
      };
    }
    return {
      outcome: 'approved',
      processor: 'maverick',
      processorTxnId: res.transactionId,
      captured: capture,
      amount,
    };
  }

  return {
    outcome: 'declined',
    processor: 'maverick',
    code: declineCodeFor(res.responseCode),
    message: res.responseMessage || 'Your card was declined.',
    processorTxnId: res.transactionId,
  };
}

/** Processor/gateway malfunction — nobody asked the issuer, so a retry is safe. */
function isProcessorFault(responseCode: string): boolean {
  return responseCode === '96';
}

function declineCodeFor(
  responseCode: string,
): Extract<AuthResult, { outcome: 'declined' }>['code'] {
  switch (responseCode) {
    case '51':
      return 'insufficient_funds';
    case '54':
      return 'expired_card';
    case '14':
    case '15':
    case '82':
      return 'invalid_card';
    case '91':
    case '92':
      return 'processing_error';
    default:
      return 'declined';
  }
}

/* --- simulation ------------------------------------------------------------ */

const ledger = simulatedLedger('maverick', 'mav');

/** Test/demo-reset hook. Never called from a request path. */
export function resetMaverickProcessor(): void {
  ledger.reset();
}

export function maverickMode(creds: ProcessorCredentials): 'live' | 'simulated' {
  return creds.apiKey && creds.merchantId ? 'live' : 'simulated';
}

/**
 * Builds the response Maverick *would* have sent, then runs it through the same
 * mapper the live branch uses — so simulated and live modes cannot drift.
 */
function simulateResponse(card: CardMaterial): MaverickAuthResponse {
  switch (classifyTestCard(card.number)) {
    case 'declined':
      return {
        status: 'declined',
        transactionId: null,
        responseCode: '05',
        responseMessage: 'Do not honor',
      };
    case 'insufficient_funds':
      return {
        status: 'declined',
        transactionId: null,
        responseCode: '51',
        responseMessage: 'Insufficient funds',
      };
    // 'hard_failure' included: maverick is the healthy processor in the demo's
    // failover story, so the outage card approves here.
    default:
      return {
        status: 'approved',
        transactionId: ledger.newTxnId(),
        responseCode: '00',
        responseMessage: 'Approved',
      };
  }
}

/* --- live calls ------------------------------------------------------------ */

/** Integer-only: `amount / 100` would put a float on the wire (SPEC §5). */
export function toDecimalString(amount: MoneyDto): string {
  const factor = minorUnitFactor(amount.currencyCode);
  const places = String(factor).length - 1;
  const sign = amount.amount < 0 ? '-' : '';
  const abs = Math.abs(amount.amount);
  const whole = Math.trunc(abs / factor);
  if (places === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(abs % factor).padStart(places, '0')}`;
}

function buildAuthRequest(
  req: AuthorizeRequest,
  card: CardMaterial,
  creds: ProcessorCredentials,
): MaverickAuthRequest {
  const address = req.billingAddress;
  return {
    merchantId: creds.merchantId ?? '',
    amount: toDecimalString(req.amount),
    currency: req.amount.currencyCode,
    capture: req.capture,
    card: {
      number: card.number,
      expiration: `${String(card.expMonth).padStart(2, '0')}${String(card.expYear).slice(-2)}`,
      cvv: card.cvc,
      ...(card.cardholderName ? { cardholderName: card.cardholderName } : {}),
    },
    ...(req.reference ? { orderId: req.reference } : {}),
    ...(req.customer?.email ? { customerEmail: req.customer.email } : {}),
    ...(address
      ? {
          billing: {
            ...(address.firstName || address.lastName
              ? { name: [address.firstName, address.lastName].filter(Boolean).join(' ') }
              : {}),
            address1: address.address1,
            ...(address.address2 ? { address2: address.address2 } : {}),
            city: address.city,
            ...(address.provinceCode ? { state: address.provinceCode } : {}),
            postalCode: address.zip,
            country: address.countryCode,
          },
        }
      : {}),
  };
}

export type MaverickPost<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; retryable: boolean };

/**
 * Every way a live call can fail, classified once.
 *
 * The distinction that matters is the same one the router keys on. A non-2xx is
 * NOT an answer about the card, so it must never become a decline: an expired
 * API key answering 401 on every request would otherwise read as "your card was
 * declined" to every customer, on every card, with no failover — the exact
 * inversion of SPEC §11.
 */
export function classifyMaverickStatus(status: number): { message: string; retryable: boolean } {
  // Transport, throttling, or our credentials — another processor may work.
  if (status >= 500 || status === 401 || status === 403 || status === 408 || status === 429) {
    return { message: `Maverick returned ${status}`, retryable: true };
  }
  // Any other 4xx is a malformed request of ours. Retrying it against a second
  // processor just repeats the bug, so it stops here.
  return { message: `Maverick rejected the request (${status})`, retryable: false };
}

async function post<T>(
  path: string,
  body: unknown,
  creds: ProcessorCredentials,
  idempotencyKey?: string,
): Promise<MaverickPost<T>> {
  const baseUrl = creds.baseUrl ?? DEFAULT_BASE_URL;
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${creds.apiKey ?? ''}`,
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, ...classifyMaverickStatus(res.status) };
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    // No answer at all: timeout, DNS, connection reset, unparseable body.
    // Deliberately not `String(err)` on the request — it carried a PAN.
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Maverick is unreachable',
      retryable: true,
    };
  }
}

/* --- adapter --------------------------------------------------------------- */

async function authorize(
  req: AuthorizeRequest,
  card: CardMaterial,
  creds: ProcessorCredentials,
): Promise<AuthResult> {
  if (maverickMode(creds) === 'live') {
    // No local replay cache on this path: the idempotency-key header makes
    // Maverick itself the authority on what a replay returns.
    const res = await post<MaverickAuthResponse>(
      '/api/transaction/authorize',
      buildAuthRequest(req, card, creds),
      creds,
      req.idempotencyKey,
    );
    if (!res.ok) {
      return res.retryable
        ? { outcome: 'hard_failure', processor: 'maverick', message: res.message, retryable: true }
        : {
            outcome: 'declined',
            processor: 'maverick',
            code: 'processing_error',
            message: res.message,
            processorTxnId: null,
          };
    }
    return mapMaverickAuthResponse(res.data, req.amount, req.capture);
  }

  const fingerprint = SimulatedProcessor.fingerprint(req.amount, card, req.capture);
  const replay = ledger.recall(req.idempotencyKey, fingerprint);
  if (replay) return replay;

  const mapped = mapMaverickAuthResponse(simulateResponse(card), req.amount, req.capture);
  // Mark BEFORE remembering, or a replayed approval comes back unmarked and the
  // admin shows a simulated charge as if it were real.
  const result: AuthResult =
    mapped.outcome === 'approved'
      ? { ...mapped, raw: { simulated: true, processor: 'maverick' } }
      : mapped;

  ledger.remember(req.idempotencyKey, fingerprint, result);
  if (result.outcome === 'approved') {
    ledger.recordAuthorization(result.processorTxnId, req.amount, result.captured);
  }
  return result;
}

async function capture(
  txnId: string,
  amount: MoneyDto,
  creds: ProcessorCredentials,
): Promise<ProcessorResult> {
  if (maverickMode(creds) === 'simulated') return ledger.capture(txnId, amount);
  return liveTransaction('/api/transaction/capture', { transactionId: txnId, amount }, creds);
}

async function refund(
  txnId: string,
  amount: MoneyDto,
  creds: ProcessorCredentials,
  opts?: { idempotencyKey?: string },
): Promise<ProcessorResult> {
  if (maverickMode(creds) === 'simulated') return ledger.refund(txnId, amount);
  return liveTransaction('/api/transaction/refund', { transactionId: txnId, amount }, creds, {
    idempotencyKey: opts?.idempotencyKey,
  });
}

async function voidAuth(txnId: string, creds: ProcessorCredentials): Promise<ProcessorResult> {
  if (maverickMode(creds) === 'simulated') return ledger.voidAuth(txnId);
  return liveTransaction('/api/transaction/void', { transactionId: txnId }, creds);
}

async function liveTransaction(
  path: string,
  args: { transactionId: string; amount?: MoneyDto },
  creds: ProcessorCredentials,
  opts?: { idempotencyKey?: string },
): Promise<ProcessorResult> {
  const res = await post<MaverickTransactionResponse>(
    path,
    {
      merchantId: creds.merchantId ?? '',
      transactionId: args.transactionId,
      ...(args.amount ? { amount: toDecimalString(args.amount) } : {}),
    },
    creds,
    opts?.idempotencyKey,
  );
  if (!res.ok) {
    return {
      outcome: 'failure',
      processor: 'maverick',
      message: res.message,
      retryable: res.retryable,
    };
  }
  if (res.data.status !== 'approved' || !res.data.transactionId) {
    return {
      outcome: 'failure',
      processor: 'maverick',
      message: res.data.responseMessage || 'Maverick rejected the request.',
      retryable: false,
    };
  }
  return {
    outcome: 'success',
    processor: 'maverick',
    processorTxnId: res.data.transactionId,
    ...(args.amount ? { amount: args.amount } : {}),
  };
}

/**
 * Simulated mode is a working mode, not a broken one — the demo routes real
 * checkouts through it — so it reports connected. With credentials present we
 * ask Maverick.
 */
async function verifyCredentials(creds: ProcessorCredentials): Promise<boolean> {
  if (maverickMode(creds) === 'simulated') return true;
  const res = await post<{ status?: string }>(
    '/api/merchant/verify',
    { merchantId: creds.merchantId },
    creds,
  );
  return res.ok;
}

export const maverickAdapter: ProcessorAdapter = {
  key: 'maverick',
  authorize,
  capture,
  refund,
  voidAuth,
  verifyCredentials,
};
