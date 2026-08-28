/**
 * `stripe` processor adapter (SPEC §11). Owner: WS-D.
 *
 * Real implementation: vault decrypts the PAN → Stripe PaymentMethod →
 * PaymentIntent, using the merchant's own key from ProcessorConfig. Not
 * connected unless the merchant pastes a key.
 *
 * The interesting code in this file is `classifyStripeError`. Everything else
 * is SDK plumbing; that function is where the "declines never cascade" rule of
 * SPEC §11 is actually enforced, and it is what the unit tests cover.
 *
 * NOTE on raw PAN: Stripe gates unformatted card numbers on the API behind PCI
 * enablement, so a stock account will reject `paymentMethods.create` with a
 * card object. That is Stripe's policy, not a bug here — SPEC §11 says this
 * adapter "works if the merchant pastes real/test keys", and a merchant whose
 * account is not enabled sees the resulting error mapped to a decline.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type { AuthorizeRequest, AuthResult, ProcessorResult } from '@merchant/contracts/pay';
import Stripe from 'stripe';
import type { CardMaterial, ProcessorAdapter, ProcessorCredentials } from '../adapter.ts';

/* --- error classification (the part that matters) -------------------------- */

type DeclineCode = Extract<AuthResult, { outcome: 'declined' }>['code'];

export type StripeFailure =
  | { outcome: 'declined'; code: DeclineCode; message: string }
  | { outcome: 'hard_failure'; message: string };

/**
 * Stripe error → the one distinction the router keys on.
 *
 *   declined     — terminal. The card, the account or the request was rejected.
 *                  Trying the next processor would either fail identically or,
 *                  worse, retry a rejected card somewhere else, which is how a
 *                  platform gets flagged for card testing.
 *   hard_failure — we never got an answer, or the answer was about OUR
 *                  credentials rather than the card. Another processor may work.
 *
 * Dispatch is on `err.type` (the class name Stripe stamps on every error)
 * rather than `instanceof`, so a duplicated copy of the SDK in node_modules
 * cannot silently downgrade every card decline into a hard failure.
 */
export function classifyStripeError(err: unknown): StripeFailure {
  const type = errorType(err);
  const message = errorMessage(err);

  switch (type) {
    case 'StripeCardError':
      return { outcome: 'declined', code: declineCodeFor(err), message };

    // No answer, or an answer about the platform rather than the card.
    case 'StripeConnectionError':
    case 'StripeAPIError':
    case 'StripeRateLimitError':
    case 'RateLimitError':
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      return { outcome: 'hard_failure', message };

    // Our own bug, or a key replayed with different parameters. Failing over
    // would repeat the bug against a second processor — or double-charge.
    case 'StripeInvalidRequestError':
    case 'StripeIdempotencyError':
    case 'StripeSignatureVerificationError':
      return { outcome: 'declined', code: 'processing_error', message };

    default:
      // Unrecognised throw. It happens around the SDK call rather than inside a
      // completed charge, so no money has moved and failover is safe.
      return { outcome: 'hard_failure', message };
  }
}

/**
 * Stripe's `decline_code` is the issuer's reason; `code` is Stripe's own and is
 * usually just `card_declined`. Prefer the former.
 *
 * `try_again_later` and `issuer_not_available` look retryable and are not: the
 * issuer answered, and the next processor reaches the same issuer.
 */
function declineCodeFor(err: unknown): DeclineCode {
  const raw = err as { decline_code?: unknown; code?: unknown };
  // Stripe fills an absent decline_code with '' rather than leaving it
  // undefined, so `??` alone would let the empty string shadow `code`.
  const code = nonEmpty(raw.decline_code) ?? nonEmpty(raw.code);

  switch (code) {
    case 'insufficient_funds':
      return 'insufficient_funds';
    case 'expired_card':
      return 'expired_card';
    case 'incorrect_cvc':
    case 'invalid_cvc':
    case 'incorrect_number':
    case 'invalid_number':
    case 'invalid_expiry_month':
    case 'invalid_expiry_year':
    case 'incorrect_zip':
    case 'card_not_supported':
      return 'invalid_card';
    case 'processing_error':
    case 'issuer_not_available':
    case 'try_again_later':
    case 'reenter_transaction':
    case 'approve_with_id':
      return 'processing_error';
    default:
      return 'declined';
  }
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function errorType(err: unknown): string {
  const type = (err as { type?: unknown } | null)?.type;
  if (typeof type === 'string') return type;
  return err instanceof Error ? err.constructor.name : 'Unknown';
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'The payment could not be processed.';
}

function toAuthResult(failure: StripeFailure): AuthResult {
  return failure.outcome === 'declined'
    ? { ...failure, processor: 'stripe', processorTxnId: null }
    : { ...failure, processor: 'stripe', retryable: true };
}

function toProcessorResult(failure: StripeFailure): ProcessorResult {
  return {
    outcome: 'failure',
    processor: 'stripe',
    message: failure.message,
    retryable: failure.outcome === 'hard_failure',
  };
}

/* --- SDK plumbing ---------------------------------------------------------- */

/**
 * Keyed by the secret key itself, so two shops can never share a client. Stripe
 * clients hold a keep-alive agent, which is the only reason to reuse them.
 */
const clients = new Map<string, Stripe>();

class MissingStripeKey extends Error {
  readonly type = 'StripeAuthenticationError';
  constructor() {
    super('Stripe is not connected: no secret key on this processor configuration.');
  }
}

function client(creds: ProcessorCredentials): Stripe {
  const secretKey = creds.secretKey ?? '';
  if (!secretKey) throw new MissingStripeKey();

  const existing = clients.get(secretKey);
  if (existing) return existing;
  // maxNetworkRetries stays at Stripe's default of 1: retrying the *same*
  // processor under an idempotency key is safe, and it keeps a single dropped
  // packet from burning a failover slot.
  const created = new Stripe(secretKey, { timeout: 20_000 });
  clients.set(secretKey, created);
  return created;
}

/** Stripe amounts are minor units too, so no conversion — only the case differs. */
const currency = (amount: MoneyDto) => amount.currencyCode.toLowerCase();

async function authorize(
  req: AuthorizeRequest,
  card: CardMaterial,
  creds: ProcessorCredentials,
): Promise<AuthResult> {
  try {
    const stripe = client(creds);

    const paymentMethod = await stripe.paymentMethods.create(
      {
        type: 'card',
        card: {
          number: card.number,
          exp_month: card.expMonth,
          exp_year: card.expYear,
          cvc: card.cvc,
        },
        billing_details: billingDetails(req, card),
      },
      // Suffixed so a retry of the whole authorize call replays both halves.
      { idempotencyKey: `${req.idempotencyKey}:pm` },
    );

    const intent = await stripe.paymentIntents.create(
      {
        amount: req.amount.amount,
        currency: currency(req.amount),
        payment_method: paymentMethod.id,
        confirm: true,
        capture_method: req.capture ? 'automatic' : 'manual',
        // No redirect-based methods: this is a card charge on our own checkout.
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        ...(req.customer?.email ? { receipt_email: req.customer.email } : {}),
        ...(req.reference ? { description: req.reference } : {}),
      },
      { idempotencyKey: req.idempotencyKey },
    );

    return intentToAuthResult(intent, req);
  } catch (err) {
    return toAuthResult(classifyStripeError(err));
  }
}

function intentToAuthResult(intent: Stripe.PaymentIntent, req: AuthorizeRequest): AuthResult {
  switch (intent.status) {
    case 'succeeded':
      return {
        outcome: 'approved',
        processor: 'stripe',
        processorTxnId: intent.id,
        captured: true,
        amount: req.amount,
      };
    case 'requires_capture':
      return {
        outcome: 'approved',
        processor: 'stripe',
        processorTxnId: intent.id,
        captured: false,
        amount: req.amount,
      };
    case 'requires_action':
    case 'requires_confirmation':
      return {
        outcome: 'declined',
        processor: 'stripe',
        code: 'processing_error',
        message: 'This card requires 3-D Secure authentication, which checkout does not support.',
        processorTxnId: intent.id,
      };
    default:
      // requires_payment_method (the confirm was rejected without throwing),
      // processing, canceled. All terminal for a card charge.
      return {
        outcome: 'declined',
        processor: 'stripe',
        code: 'declined',
        message: intent.last_payment_error?.message ?? 'Your card was declined.',
        processorTxnId: intent.id,
      };
  }
}

function billingDetails(
  req: AuthorizeRequest,
  card: CardMaterial,
): Stripe.PaymentMethodCreateParams.BillingDetails {
  const address = req.billingAddress;
  const name =
    card.cardholderName ??
    req.customer?.name ??
    [address?.firstName, address?.lastName].filter(Boolean).join(' ');

  return {
    ...(name ? { name } : {}),
    ...(req.customer?.email ? { email: req.customer.email } : {}),
    ...(address
      ? {
          address: {
            line1: address.address1,
            line2: address.address2 ?? undefined,
            city: address.city,
            state: address.provinceCode ?? address.province ?? undefined,
            postal_code: address.zip,
            country: address.countryCode,
          },
        }
      : {}),
  };
}

async function capture(
  txnId: string,
  amount: MoneyDto,
  creds: ProcessorCredentials,
): Promise<ProcessorResult> {
  try {
    const intent = await client(creds).paymentIntents.capture(txnId, {
      amount_to_capture: amount.amount,
    });
    return { outcome: 'success', processor: 'stripe', processorTxnId: intent.id, amount };
  } catch (err) {
    return toProcessorResult(classifyStripeError(err));
  }
}

async function refund(
  txnId: string,
  amount: MoneyDto,
  creds: ProcessorCredentials,
): Promise<ProcessorResult> {
  try {
    // The refund id, not the intent id: a payment has many refunds, and the
    // admin's refund row needs to point at its own.
    const created = await client(creds).refunds.create({
      payment_intent: txnId,
      amount: amount.amount,
    });
    return { outcome: 'success', processor: 'stripe', processorTxnId: created.id, amount };
  } catch (err) {
    return toProcessorResult(classifyStripeError(err));
  }
}

async function voidAuth(txnId: string, creds: ProcessorCredentials): Promise<ProcessorResult> {
  try {
    const intent = await client(creds).paymentIntents.cancel(txnId);
    return { outcome: 'success', processor: 'stripe', processorTxnId: intent.id };
  } catch (err) {
    return toProcessorResult(classifyStripeError(err));
  }
}

/** Cheap authenticated GET. Any failure means "do not mark this connected". */
async function verifyCredentials(creds: ProcessorCredentials): Promise<boolean> {
  try {
    await client(creds).balance.retrieve();
    return true;
  } catch {
    return false;
  }
}

export const stripeAdapter: ProcessorAdapter = {
  key: 'stripe',
  authorize,
  capture,
  refund,
  voidAuth,
  verifyCredentials,
};
