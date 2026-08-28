/**
 * Cancelling an order (SPEC §9).
 *
 * Shopify's rule, and ours: money first. An order that has been paid cannot be
 * cancelled outright — it is refunded (C3), and refunding is what cancels it.
 * Cancelling an unpaid or merely authorized order voids it, which is exactly
 * what "void the authorization" means.
 *
 * Owner: WS-C.
 */
import { newId } from '@merchant/config/ids';
import {
  type CancelOrderInput,
  cancelOrderInput,
  type OrderDetail,
} from '@merchant/contracts/orders';
import type { TenantClient } from '@merchant/db/tenant';
import { conflict, notFound } from '../../lib/errors.ts';
import { adjustMany } from '../inventory/adjust.ts';
import { loadOrderDetail } from './detail.ts';
import { notifyOrder } from './notify.ts';

/** Money has already changed hands; C3's refund flow is the only way out. */
const NEEDS_REFUND_FIRST = new Set(['paid', 'partially_refunded', 'refunded']);

/**
 * Put the ordered quantities back, through B4's adjustment service so every
 * level change carries its history (CLAUDE.md §9).
 *
 * Stock returns to the location the variant is tracked at. Once a line has
 * actually shipped, the fulfillment records where from — C3 restocks a refund
 * the same way, and both should follow the fulfillment when one exists.
 */
async function restockLines(
  db: TenantClient,
  order: { id: string; lineItems: Array<{ variantId: string | null; quantity: number }> },
  actor: string | null,
): Promise<void> {
  const wanted = new Map<string, number>();
  for (const item of order.lineItems) {
    if (!item.variantId) continue;
    wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.quantity);
  }
  if (wanted.size === 0) return;

  const levels = await db.inventoryLevel.findMany({
    where: { variantId: { in: [...wanted.keys()] } },
    orderBy: [{ variantId: 'asc' }, { locationId: 'asc' }],
  });

  const seen = new Set<string>();
  const adjustments = [];
  for (const level of levels) {
    // One location per variant: the first it is stocked at, deterministically.
    if (seen.has(level.variantId)) continue;
    seen.add(level.variantId);
    const quantity = wanted.get(level.variantId);
    if (!quantity) continue;
    adjustments.push({
      variantId: level.variantId,
      locationId: level.locationId,
      delta: quantity,
      reason: 'restock' as const,
      referenceId: order.id,
      actor,
    });
  }

  if (adjustments.length > 0) await adjustMany(db, adjustments);
}

export async function cancelOrder(
  db: TenantClient,
  shopId: string,
  orderId: string,
  input: CancelOrderInput,
  actor: string | null,
): Promise<OrderDetail> {
  const options = cancelOrderInput.parse(input);

  const existing = await db.order.findUnique({
    where: { id: orderId },
    include: { lineItems: true },
  });
  if (!existing) throw notFound('Order');
  if (existing.cancelledAt) throw conflict('This order is already cancelled.');
  if (NEEDS_REFUND_FIRST.has(existing.financialStatus)) {
    throw conflict('Refund this order before cancelling it.', 'financialStatus');
  }

  // Before the order transaction, not inside it: the adjustment service runs
  // its own transaction (it has to — the row locks are what make concurrent
  // decrements safe), and it is also the step that can legitimately refuse.
  if (options.restock) {
    await restockLines(db, existing, actor);
  }

  const order = await db.$transaction(async (tx) => {
    return tx.order.update({
      where: { id: orderId },
      data: {
        cancelledAt: new Date(),
        cancelReason: options.reason,
        // Nothing was captured, so there is nothing to refund — void it.
        financialStatus: 'voided',
        events: {
          create: [
            {
              id: newId('event'),
              shopId,
              type: 'order_cancelled',
              message: `Order cancelled (${options.reason}).`,
              actor,
              payload: { restocked: options.restock },
            },
          ],
        },
      },
      include: { lineItems: true, events: { orderBy: { createdAt: 'asc' } } },
    });
  });

  // `input.refund` is C3's to honour (there is nothing captured to refund while
  // this path rejects paid orders) and `input.notifyCustomer` is G1's.
  await notifyOrder({
    shopId,
    topic: 'orders/cancelled',
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
      currencyCode: order.currencyCode,
    },
  });

  return loadOrderDetail(db, orderId);
}
