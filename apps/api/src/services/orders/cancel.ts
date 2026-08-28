/**
 * Cancelling an order (SPEC §9).
 *
 * Shopify's rule, and ours: money first. An order holding captured money
 * cannot be cancelled outright — it is refunded (C3) first. Once every cent
 * has gone back (`financialStatus === 'refunded'`), cancelling is allowed and
 * skips the money step: there is nothing left to void. Cancelling an unpaid or
 * merely authorized order voids it, which is exactly what "void the
 * authorization" means.
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

/** Captured money is still out there; C3's refund flow is the only way on. */
const NEEDS_REFUND_FIRST = new Set(['paid', 'partially_refunded']);

type CancellableOrder = {
  id: string;
  lineItems: Array<{ id: string; variantId: string | null; quantity: number }>;
  refunds: Array<{ restock: boolean; lineItems: unknown }>;
};

/** Units per line a `restock: true` refund already put back on the shelf. */
function refundRestockedByLine(refunds: CancellableOrder['refunds']): Map<string, number> {
  const returned = new Map<string, number>();
  for (const refund of refunds) {
    if (!refund.restock || !Array.isArray(refund.lineItems)) continue;
    for (const item of refund.lineItems as Array<{ lineItemId?: string; quantity?: number }>) {
      if (!item?.lineItemId || typeof item.quantity !== 'number') continue;
      returned.set(item.lineItemId, (returned.get(item.lineItemId) ?? 0) + item.quantity);
    }
  }
  return returned;
}

/**
 * Put the ordered quantities back, through B4's adjustment service so every
 * level change carries its history (CLAUDE.md §9) — LESS whatever a
 * `restock: true` refund already returned, which must not come back twice.
 *
 * Stock returns to the location the variant is tracked at. Once a line has
 * actually shipped, the fulfillment records where from — C3 restocks a refund
 * the same way, and both should follow the fulfillment when one exists.
 */
async function restockLines(
  db: TenantClient,
  order: CancellableOrder,
  actor: string | null,
): Promise<void> {
  const alreadyReturned = refundRestockedByLine(order.refunds);

  const wanted = new Map<string, number>();
  for (const item of order.lineItems) {
    if (!item.variantId) continue;
    const quantity = Math.max(0, item.quantity - (alreadyReturned.get(item.id) ?? 0));
    if (quantity === 0) continue;
    wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + quantity);
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
    include: { lineItems: true, refunds: true },
  });
  if (!existing) throw notFound('Order');
  if (existing.cancelledAt) throw conflict('This order is already cancelled.');
  if (NEEDS_REFUND_FIRST.has(existing.financialStatus)) {
    throw conflict('Refund this order before cancelling it.', 'financialStatus');
  }

  // A fully refunded order keeps saying so — the money went back, it was not
  // voided. `voided` is for orders where nothing was ever captured.
  const financialStatus = existing.financialStatus === 'refunded' ? 'refunded' : 'voided';

  // Claim the cancellation: exactly one request flips `cancelledAt`, and only
  // the winner restocks, gives the discount back, and notifies. The guard read
  // above is a courtesy; this `updateMany` is what holds under concurrency.
  const claimed = await db.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: orderId, cancelledAt: null },
      data: {
        cancelledAt: new Date(),
        cancelReason: options.reason,
        financialStatus,
      },
    });
    if (claim.count === 0) return false;

    await tx.orderEvent.create({
      data: {
        id: newId('event'),
        shopId,
        orderId,
        type: 'order_cancelled',
        message: `Order cancelled (${options.reason}).`,
        actor,
        payload: { restocked: options.restock },
      },
    });

    // Give the discount back: a cancelled order must not burn a usage-limited
    // code forever. The redemption rows are the authority on what was used
    // (create.ts wrote one per applied code), and removing them is what lets
    // `oncePerCustomer` allow this customer to try again.
    const redemptions = await tx.discountRedemption.findMany({
      where: { orderId },
      select: { id: true, discountId: true },
    });
    for (const redemption of redemptions) {
      await tx.discount.updateMany({
        where: { id: redemption.discountId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    if (redemptions.length > 0) {
      await tx.discountRedemption.deleteMany({ where: { orderId } });
    }
    return true;
  });
  if (!claimed) throw conflict('This order is already cancelled.');

  // After the claim, so a losing request cannot restock a second time. The
  // order is already cancelled at this point, so a failure here degrades (log
  // and carry on, like notify) instead of 500ing a cancellation that happened.
  if (options.restock) {
    try {
      await restockLines(db, existing, actor);
    } catch (error) {
      console.warn(
        `cancel: restock for order ${orderId} failed — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // `input.refund` is C3's to honour (there is nothing captured to refund while
  // this path rejects paid orders) and `input.notifyCustomer` is G1's.
  await notifyOrder({
    shopId,
    topic: 'orders/cancelled',
    order: {
      id: existing.id,
      orderNumber: existing.orderNumber,
      email: existing.email,
      total: existing.total,
      currencyCode: existing.currencyCode,
    },
  });

  return loadOrderDetail(db, orderId);
}
