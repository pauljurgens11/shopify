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
import { notifyOrder } from './notify.ts';
import { toOrderDetail } from './serialize.ts';

/** Money has already changed hands; C3's refund flow is the only way out. */
const NEEDS_REFUND_FIRST = new Set(['paid', 'partially_refunded', 'refunded']);

type Tx = Parameters<Parameters<TenantClient['$transaction']>[0]>[0];

/**
 * Put the ordered quantities back, with an `InventoryAdjustment` for each —
 * a level that moves without history is a bug (CLAUDE.md §9).
 *
 * B4 owns `services/inventory` and its adjust service does not exist yet; when
 * it lands this function becomes a call to it. The invariant it must preserve
 * is the one enforced here: never write a level without writing its adjustment.
 *
 * Stock goes back to the location it is tracked at. Once C3 lands, a line that
 * was actually fulfilled should return to the location that shipped it instead.
 */
async function restockLines(
  tx: Tx,
  shopId: string,
  order: { id: string; lineItems: Array<{ variantId: string | null; quantity: number }> },
  actor: string | null,
): Promise<void> {
  const wanted = new Map<string, number>();
  for (const item of order.lineItems) {
    if (!item.variantId) continue;
    wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.quantity);
  }
  if (wanted.size === 0) return;

  const levels = await tx.inventoryLevel.findMany({
    where: { variantId: { in: [...wanted.keys()] } },
    orderBy: [{ variantId: 'asc' }, { locationId: 'asc' }],
  });

  const seen = new Set<string>();
  for (const level of levels) {
    // One location per variant: the first one it is stocked at, deterministically.
    if (seen.has(level.variantId)) continue;
    seen.add(level.variantId);

    const quantity = wanted.get(level.variantId);
    if (!quantity) continue;

    await tx.inventoryLevel.update({
      where: { id: level.id },
      data: { available: { increment: quantity } },
    });
    await tx.inventoryAdjustment.create({
      data: {
        id: newId('inventory'),
        shopId,
        variantId: level.variantId,
        locationId: level.locationId,
        delta: quantity,
        reason: 'restocked',
        referenceId: order.id,
        actor,
      },
    });
  }
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

  const order = await db.$transaction(async (tx) => {
    if (options.restock) {
      await restockLines(tx, shopId, existing, actor);
    }

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

  return toOrderDetail(order);
}
