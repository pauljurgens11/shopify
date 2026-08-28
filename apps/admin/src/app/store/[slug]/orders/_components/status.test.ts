import { financialStatusSchema, fulfillmentStatusSchema } from '@merchant/contracts/orders';
import type { Payment } from '@merchant/contracts/pay';
import { describe, expect, it } from 'vitest';
import {
  capturedTotal,
  financialBadge,
  fulfillmentBadge,
  remainingToFulfil,
  remainingToRefund,
} from './status.ts';

/**
 * PARITY.md calls the badges out by name: this is the page reviewers
 * screenshot, and a snake_case enum leaking onto it is the exact failure.
 */
describe('order badges', () => {
  it('never shows a raw enum value to a merchant', () => {
    const labels = [
      ...financialStatusSchema.options.map((s) => financialBadge(s).label),
      ...fulfillmentStatusSchema.options.map((s) => fulfillmentBadge(s).label),
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/_/);
      expect(label[0]).toBe(label[0]?.toUpperCase());
    }
  });

  it('covers every status the API can return', () => {
    for (const status of financialStatusSchema.options) {
      expect(financialBadge(status)).toBeDefined();
    }
    for (const status of fulfillmentStatusSchema.options) {
      expect(fulfillmentBadge(status)).toBeDefined();
    }
  });

  it('uses Shopify’s wording and tone for the three badges that matter', () => {
    // PARITY.md badge table: `Paid` is the default subdued badge, not green.
    expect(financialBadge('paid')).toMatchObject({ label: 'Paid', tone: undefined });
    expect(fulfillmentBadge('unfulfilled')).toMatchObject({
      label: 'Unfulfilled',
      tone: 'attention',
    });
    expect(financialBadge('partially_refunded').label).toBe('Partially refunded');
  });
});

describe('remaining quantities', () => {
  it('defaults the fulfil form to what has not shipped or been refunded', () => {
    expect(remainingToFulfil({ quantity: 3, fulfilledQuantity: 1, refundedQuantity: 0 })).toBe(2);
    expect(remainingToFulfil({ quantity: 3, fulfilledQuantity: 1, refundedQuantity: 1 })).toBe(1);
  });

  /**
   * Over-fulfilment is not supposed to happen, but a negative default would put
   * a nonsense number in the stepper rather than simply disabling the line.
   */
  it('never goes negative when the data disagrees with itself', () => {
    expect(remainingToFulfil({ quantity: 1, fulfilledQuantity: 5, refundedQuantity: 0 })).toBe(0);
    expect(remainingToRefund({ quantity: 1, refundedQuantity: 5 })).toBe(0);
  });

  it('lets a fulfilled unit still be refunded', () => {
    expect(remainingToRefund({ quantity: 2, refundedQuantity: 0 })).toBe(2);
    expect(remainingToRefund({ quantity: 2, refundedQuantity: 1 })).toBe(1);
  });
});

describe('capturedTotal', () => {
  const payment = (status: Payment['status'], amount: number) =>
    ({ status, amount: { amount, currencyCode: 'USD' } }) as Payment;

  /**
   * The bug this exists to stop: a refund flips the payment's status, and
   * counting only `captured` then reports "Paid by customer $0.00" and the
   * full total as outstanding on an order the customer really did pay.
   */
  it('still counts a payment the merchant has since refunded', () => {
    expect(capturedTotal([payment('partially_refunded', 42749)], 'USD').amount).toBe(42749);
    expect(capturedTotal([payment('refunded', 42749)], 'USD').amount).toBe(42749);
    expect(capturedTotal([payment('captured', 42749)], 'USD').amount).toBe(42749);
  });

  it('ignores money that never actually moved', () => {
    expect(capturedTotal([payment('authorized', 1000)], 'USD').amount).toBe(0);
    expect(capturedTotal([payment('voided', 1000)], 'USD').amount).toBe(0);
    expect(capturedTotal([payment('failed', 1000)], 'USD').amount).toBe(0);
  });

  it('sums split payments and keeps the order currency', () => {
    const total = capturedTotal([payment('captured', 1000), payment('refunded', 500)], 'USD');
    expect(total).toEqual({ amount: 1500, currencyCode: 'USD' });
  });
});
