/**
 * Stripe adapter — error mapping only (SPEC §14.2).
 *
 * Not tested here: the SDK calls themselves. Wrapping `paymentIntents.create`
 * in mocks would test the mock, which SPEC §14 explicitly forbids. What IS real
 * logic — and what the router bets money on — is the classification of a Stripe
 * error into `declined` (terminal) or `hard_failure` (may fail over). These are
 * genuine `Stripe.errors.*` instances, not stubs.
 */
import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { classifyStripeError } from './stripe.ts';

const cardError = (raw: Record<string, unknown>) =>
  new Stripe.errors.StripeCardError({ type: 'card_error', message: 'card error', ...raw });

describe('classifyStripeError — card errors are declines, never hard failures', () => {
  it('maps a generic decline', () => {
    expect(classifyStripeError(cardError({ code: 'card_declined' }))).toMatchObject({
      outcome: 'declined',
      code: 'declined',
    });
  });

  it('prefers decline_code over code, which is where the real reason lives', () => {
    expect(
      classifyStripeError(cardError({ code: 'card_declined', decline_code: 'insufficient_funds' })),
    ).toMatchObject({ outcome: 'declined', code: 'insufficient_funds' });
  });

  it('maps expiry and card-data errors onto the contract decline codes', () => {
    expect(classifyStripeError(cardError({ code: 'expired_card' }))).toMatchObject({
      code: 'expired_card',
    });
    expect(classifyStripeError(cardError({ code: 'incorrect_cvc' }))).toMatchObject({
      code: 'invalid_card',
    });
    expect(classifyStripeError(cardError({ code: 'incorrect_number' }))).toMatchObject({
      code: 'invalid_card',
    });
  });

  it('keeps transient issuer declines terminal — retrying elsewhere is card testing', () => {
    for (const decline_code of ['try_again_later', 'issuer_not_available', 'processing_error']) {
      const result = classifyStripeError(cardError({ code: 'card_declined', decline_code }));
      expect(result).toMatchObject({ outcome: 'declined', code: 'processing_error' });
    }
  });
});

describe('classifyStripeError — transport and credential failures may fail over', () => {
  it('maps a connection error to hard_failure', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeConnectionError({ message: 'ECONNRESET' })),
    ).toMatchObject({ outcome: 'hard_failure' });
  });

  it('maps a Stripe-side API error to hard_failure', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeAPIError({ message: 'api down' })),
    ).toMatchObject({ outcome: 'hard_failure' });
  });

  it('maps rate limiting to hard_failure', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeRateLimitError({ message: 'slow down' })),
    ).toMatchObject({ outcome: 'hard_failure' });
  });

  it('maps bad or unauthorized credentials to hard_failure so another processor is tried', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeAuthenticationError({ message: 'bad key' })),
    ).toMatchObject({ outcome: 'hard_failure' });
    expect(
      classifyStripeError(new Stripe.errors.StripePermissionError({ message: 'no access' })),
    ).toMatchObject({ outcome: 'hard_failure' });
  });

  it('treats an unrecognised throw as a hard failure', () => {
    expect(classifyStripeError(new TypeError('boom'))).toMatchObject({ outcome: 'hard_failure' });
    expect(classifyStripeError('a string')).toMatchObject({ outcome: 'hard_failure' });
  });
});

describe('classifyStripeError — our own bugs must not cascade', () => {
  it('maps an invalid request to a terminal decline, not a failover', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeInvalidRequestError({ message: 'bad param' })),
    ).toMatchObject({ outcome: 'declined', code: 'processing_error' });
  });

  it('maps an idempotency-key conflict to a terminal decline — retrying could double-charge', () => {
    expect(
      classifyStripeError(new Stripe.errors.StripeIdempotencyError({ message: 'key reused' })),
    ).toMatchObject({ outcome: 'declined', code: 'processing_error' });
  });
});

describe('stripe adapter messages', () => {
  it('never echoes anything but the processor message', () => {
    const result = classifyStripeError(
      cardError({ code: 'card_declined', message: 'Your card was declined.' }),
    );
    expect(result.message).toBe('Your card was declined.');
  });
});
