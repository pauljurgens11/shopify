/**
 * Outbound notifications for order lifecycle changes (SPEC §13).
 *
 * This is a seam, not a stub with an opinion: WS-G's producer
 * (`emitWebhookEvent` / `enqueueOrderConfirmationEmail` in
 * `@merchant/config/queue`) is not on `main` yet, so today these calls do
 * nothing. When G1 lands, the bodies below are the only place to change — the
 * order service already calls them at the right points, with the right payload.
 *
 * Whatever fills them in MUST NOT throw: an order that is already committed
 * must not fail its request because Redis blinked (G1's producer is written the
 * same way). See DECISIONS.md.
 *
 * Owner: WS-C.
 */
import type { WebhookTopic } from '@merchant/config/constants';

export type OrderNotification = {
  shopId: string;
  topic: Extract<WebhookTopic, 'orders/create' | 'orders/paid' | 'orders/cancelled'>;
  order: { id: string; orderNumber: number; email: string; total: number; currencyCode: string };
};

/** Fire-and-forget: callers do not await a delivery, only the enqueue. */
export async function notifyOrder(_notification: OrderNotification): Promise<void> {
  // WS-G: `await emitWebhookEvent(shopId, topic, order)` goes here, and for
  // 'orders/create' also `await enqueueOrderConfirmationEmail(shopId, order.id)`.
}
