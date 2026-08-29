/**
 * Outbound notifications for order lifecycle changes (SPEC §13).
 *
 * Every `orders/*` webhook is emitted from here, so a merchant writing one
 * handler sees the same body shape whichever topic fired.
 *
 * Nothing here may throw. Each function runs AFTER its order or payment row is
 * committed, so a dead Redis must not fail the request that already succeeded —
 * `@merchant/config/queue` is written the same way and swallows internally; the
 * guards below are the belt to its braces. See DECISIONS.md.
 *
 * Seam owned by WS-C; bodies filled in by WS-G when G1 landed.
 */
import type { WebhookTopic } from '@merchant/config/constants';
import { emitWebhookEvent, enqueueOrderConfirmationEmail } from '@merchant/config/queue';
import { dbForShop } from '@merchant/db/tenant';
import type { PaidEvent } from '@merchant/pay/router';

export type OrderSummary = {
  id: string;
  orderNumber: number;
  email: string;
  /** Minor units, as everywhere (SPEC §5). Becomes a Money on the way out. */
  total: number;
  currencyCode: string;
};

export type OrderNotification = {
  shopId: string;
  topic: Extract<
    WebhookTopic,
    'orders/create' | 'orders/paid' | 'orders/cancelled' | 'orders/fulfilled' | 'refunds/create'
  >;
  order: OrderSummary;
  /**
   * `refunds/create` only: the refund itself. Without it the body's only money
   * is the order's FULL original total, so a partial refund is
   * indistinguishable from a full one on the wire (DECISIONS.md).
   */
  refund?: {
    id: string;
    /** Refunded amount in minor units; becomes a Money on the way out. */
    amount: number;
  };
  /**
   * Absolute thank-you URL for the confirmation email's button. Only checkout
   * knows it (the token is the credential), so it arrives here as an option;
   * null omits the button rather than linking a customer at a guessed 404.
   */
  orderStatusUrl?: string | null;
};

/**
 * The body every `orders/*` webhook carries. `total` goes out as a Money
 * object, never a bare integer — a merchant reading `total` off the wire must
 * not have to know our minor-unit convention to charge the right amount.
 */
function orderPayload(order: OrderSummary): Record<string, unknown> {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    total: { amount: order.total, currencyCode: order.currencyCode },
  };
}

function swallow(what: string, err: unknown): void {
  console.warn(`notify: ${what} failed — ${err instanceof Error ? err.message : String(err)}`);
}

/** Fire-and-forget: callers do not await a delivery, only the enqueue. */
export async function notifyOrder({
  shopId,
  topic,
  order,
  refund,
  orderStatusUrl,
}: OrderNotification): Promise<void> {
  try {
    const payload = refund
      ? {
          ...orderPayload(order),
          refund: {
            id: refund.id,
            amount: { amount: refund.amount, currencyCode: order.currencyCode },
          },
        }
      : orderPayload(order);
    await emitWebhookEvent(shopId, topic, payload);
    if (topic === 'orders/create') {
      await enqueueOrderConfirmationEmail(shopId, order.id, orderStatusUrl ?? null);
    }
  } catch (err) {
    swallow(`${topic} for order ${order.id}`, err);
  }
}

/**
 * The Pay router's `onPaid` seam (D3). Passed as `deps.onPaid` wherever a
 * charge is made, so a capture emits `orders/paid` with the same body as the
 * other order topics rather than a payment-shaped one.
 */
export async function notifyOrderPaid(event: PaidEvent): Promise<void> {
  // A charge with no order behind it (a bare saved-card charge) is a payment,
  // not an order payment — there is no `payments/*` topic and inventing one
  // would break `webhookTopicSchema`.
  if (!event.orderId) return;

  try {
    const order = await dbForShop(event.shopId).order.findUnique({
      where: { id: event.orderId },
      select: { id: true, orderNumber: true, email: true, total: true, currencyCode: true },
    });
    if (!order) return;

    await emitWebhookEvent(event.shopId, 'orders/paid', orderPayload(order));
  } catch (err) {
    swallow(`orders/paid for order ${event.orderId}`, err);
  }
}
