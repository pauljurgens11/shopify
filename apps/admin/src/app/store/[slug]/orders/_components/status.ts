/**
 * Order status → Shopify's exact badge wording and tone (PARITY.md). Owner: WS-C.
 *
 * This is the pixel-parity surface reviewers screenshot, and the API's enum
 * values are snake_case internals — `partially_refunded` must never reach a
 * merchant's screen. Kept as data, and pinned by `status.test.ts`.
 */
import type { MoneyDto } from '@merchant/contracts/common';
import type { Order } from '@merchant/contracts/orders';
import type { Payment } from '@merchant/contracts/pay';

type Tone = 'success' | 'attention' | 'warning' | 'critical' | 'info' | undefined;
type Progress = 'incomplete' | 'partiallyComplete' | 'complete' | undefined;

export type BadgeSpec = { label: string; tone: Tone; progress: Progress };

/**
 * Shopify's payment badges: yellow while the money is owed, neutral subdued
 * once it is in or has gone back out — `Paid` is grey in current Shopify,
 * not green (PARITY.md badge table).
 */
const FINANCIAL: Record<Order['financialStatus'], BadgeSpec> = {
  pending: { label: 'Payment pending', tone: 'attention', progress: 'incomplete' },
  authorized: { label: 'Authorized', tone: 'attention', progress: 'partiallyComplete' },
  paid: { label: 'Paid', tone: undefined, progress: 'complete' },
  partially_refunded: {
    label: 'Partially refunded',
    tone: undefined,
    progress: 'partiallyComplete',
  },
  refunded: { label: 'Refunded', tone: undefined, progress: 'complete' },
  voided: { label: 'Voided', tone: undefined, progress: 'complete' },
};

/** Fulfillment badges are yellow until everything has shipped, then neutral. */
const FULFILLMENT: Record<Order['fulfillmentStatus'], BadgeSpec> = {
  unfulfilled: { label: 'Unfulfilled', tone: 'attention', progress: 'incomplete' },
  partially_fulfilled: {
    label: 'Partially fulfilled',
    tone: 'attention',
    progress: 'partiallyComplete',
  },
  fulfilled: { label: 'Fulfilled', tone: undefined, progress: 'complete' },
};

export function financialBadge(status: Order['financialStatus']): BadgeSpec {
  return FINANCIAL[status];
}

export function fulfillmentBadge(status: Order['fulfillmentStatus']): BadgeSpec {
  return FULFILLMENT[status];
}

/** A cancelled order reads as cancelled first; Shopify shows this before the rest. */
export function cancelledBadge(): BadgeSpec {
  return { label: 'Cancelled', tone: 'critical', progress: 'complete' };
}

/** Units on a line that are neither fulfilled nor refunded — the fulfil default. */
export function remainingToFulfil(line: {
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
}): number {
  return Math.max(0, line.quantity - line.fulfilledQuantity - line.refundedQuantity);
}

/** Units that can still be refunded: bought, minus what has already gone back. */
export function remainingToRefund(line: { quantity: number; refundedQuantity: number }): number {
  return Math.max(0, line.quantity - line.refundedQuantity);
}

/**
 * Statuses where the customer's money actually moved. A refund flips the
 * payment to `refunded`/`partially_refunded`, so counting only `captured`
 * reports "Paid by customer $0.00" on an order that was very much paid —
 * and then shows the whole total as outstanding.
 */
const SETTLED: ReadonlySet<Payment['status']> = new Set([
  'captured',
  'refunded',
  'partially_refunded',
]);

/** What the customer was actually charged, before any refunds came back. */
export function capturedTotal(payments: Payment[], currencyCode: string): MoneyDto {
  const amount = payments.reduce(
    (sum, payment) => sum + (SETTLED.has(payment.status) ? payment.amount.amount : 0),
    0,
  );
  return { amount, currencyCode };
}
