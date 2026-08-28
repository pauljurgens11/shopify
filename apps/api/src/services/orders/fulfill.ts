/**
 * Fulfilling an order (SPEC §9).
 *
 * Shopify's model, and ours: a fulfillment is a shipment, not a flag. It names
 * the location the stock left, the exact quantities, and optionally a tracking
 * number — and the order's `fulfillmentStatus` is derived from the line items
 * afterwards rather than set by hand, so it cannot drift from what was shipped.
 *
 * Stock: fulfillment is stock-NEUTRAL for units the order already decremented.
 * Checkout (E3) reserves stock with a `sold` adjustment referencing the order
 * before any fulfillment exists; only the shortfall — units no prior `sold`
 * adjustment for this order covers — moves here. A storefront order therefore
 * fulfils without decrementing twice, while a manual/API order (no reservation)
 * still takes its stock at fulfilment time.
 *
 * Owner: WS-C.
 */
import { newId } from '@merchant/config/ids';
import {
  type CreateFulfillmentInput,
  createFulfillmentInput,
  type OrderDetail,
} from '@merchant/contracts/orders';
import type { OrderLineItem as LineRow } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { adjustMany } from '../inventory/adjust.ts';
import { loadOrderDetail } from './detail.ts';
import { notifyOrder } from './notify.ts';

/**
 * Derived from the lines, never set directly — see the file header. Refunded
 * units no longer need shipping (the admin's `remainingToFulfil` agrees), so
 * they count as settled: refund 1 of 2 and ship the other one, and the order
 * is `fulfilled`, not stuck at `partially_fulfilled` forever.
 */
export function fulfillmentStatusFor(
  lines: Array<{ quantity: number; fulfilledQuantity: number; refundedQuantity: number }>,
): string {
  const anyFulfilled = lines.some((l) => l.fulfilledQuantity > 0);
  const allSettled = lines.every((l) => l.fulfilledQuantity + l.refundedQuantity >= l.quantity);
  if (allSettled && anyFulfilled) return 'fulfilled';
  if (anyFulfilled) return 'partially_fulfilled';
  return 'unfulfilled';
}

/** Units still to ship: bought, minus shipped, minus refunded (refunds win). */
const remainingToFulfil = (line: {
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
}): number => Math.max(0, line.quantity - line.fulfilledQuantity - line.refundedQuantity);

export async function fulfillOrder(
  db: TenantClient,
  shopId: string,
  orderId: string,
  input: CreateFulfillmentInput,
  actor: string | null,
): Promise<OrderDetail> {
  const data = createFulfillmentInput.parse(input);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { lineItems: true, fulfillments: { select: { id: true } } },
  });
  if (!order) throw notFound('Order');
  if (order.cancelledAt) throw conflict('This order is cancelled; it cannot be fulfilled.');

  const location = await db.location.findUnique({ where: { id: data.locationId } });
  if (!location) throw notFound('Location');

  const byId = new Map<string, LineRow>(order.lineItems.map((l) => [l.id, l]));
  const requested = data.lineItems.filter((l) => l.quantity > 0);
  if (requested.length === 0) throw badRequest('Choose at least one item to fulfil.', 'lineItems');

  // Snapshot validation, so an obviously bad request never touches stock. The
  // authoritative check happens again under the order row lock below — two
  // concurrent requests can both pass this one.
  for (const item of requested) {
    const line = byId.get(item.lineItemId);
    if (!line) throw notFound('Line item');
    const remaining = remainingToFulfil(line);
    if (item.quantity > remaining) {
      throw conflict(`Only ${remaining} of "${line.title}" is left to fulfil.`, 'lineItems');
    }
  }

  const fulfillmentId = newId('fulfillment');

  // Stock next, and through B4's service so every level change has its
  // adjustment row (CLAUDE.md §9). Only the SHORTFALL moves: units already
  // decremented by checkout's reservation (a `sold` adjustment referencing the
  // order) or by an earlier fulfillment (referencing its id) are not taken
  // again. This is also what lets a reserved order be fulfilled from a second
  // location that never held the stock — nothing needs to move at all.
  const priorSold = await db.inventoryAdjustment.findMany({
    where: {
      reason: 'sold',
      referenceId: { in: [orderId, ...order.fulfillments.map((f) => f.id)] },
    },
    select: { variantId: true, delta: true },
  });
  const decremented = new Map<string, number>();
  for (const row of priorSold) {
    decremented.set(row.variantId, (decremented.get(row.variantId) ?? 0) - row.delta);
  }
  const fulfilledSoFar = new Map<string, number>();
  for (const line of order.lineItems) {
    if (!line.variantId) continue;
    fulfilledSoFar.set(
      line.variantId,
      (fulfilledSoFar.get(line.variantId) ?? 0) + line.fulfilledQuantity,
    );
  }
  const requestedByVariant = new Map<string, number>();
  for (const item of requested) {
    const variantId = byId.get(item.lineItemId)?.variantId;
    if (!variantId) continue;
    requestedByVariant.set(variantId, (requestedByVariant.get(variantId) ?? 0) + item.quantity);
  }
  const stockMoves = [...requestedByVariant]
    .map(([variantId, quantity]) => {
      // Decremented units not yet consumed by a previous fulfilment cover this
      // one first; only what they cannot cover leaves the shelf now.
      const covered = Math.max(
        0,
        (decremented.get(variantId) ?? 0) - (fulfilledSoFar.get(variantId) ?? 0),
      );
      return { variantId, shortfall: Math.max(0, quantity - covered) };
    })
    .filter((move) => move.shortfall > 0)
    .map((move) => ({
      variantId: move.variantId,
      locationId: data.locationId,
      delta: -move.shortfall,
      reason: 'sold' as const,
      referenceId: fulfillmentId,
      actor,
    }));
  if (stockMoves.length > 0) await adjustMany(db, stockMoves);

  const count = requested.reduce((n, item) => n + item.quantity, 0);

  let fulfillmentStatus: string;
  try {
    fulfillmentStatus = await db.$transaction(async (tx) => {
      // Lock the order row: concurrent fulfilments serialise here and re-check
      // against the locked state, so two requests cannot both ship the last
      // unit. Raw SQL bypasses the tenant extension, hence the explicit shopId.
      const locked = await tx.$queryRaw<Array<{ cancelledAt: Date | null }>>`
        SELECT "cancelledAt" FROM "orders"
        WHERE "id" = ${orderId} AND "shopId" = ${shopId}
        FOR UPDATE
      `;
      if (locked.length === 0) throw notFound('Order');
      if (locked[0]?.cancelledAt) {
        throw conflict('This order is cancelled; it cannot be fulfilled.');
      }

      // Re-validate on the post-lock rows — the snapshot above may be stale.
      const lines = await tx.orderLineItem.findMany({ where: { orderId } });
      const current = new Map(lines.map((l) => [l.id, l]));
      for (const item of requested) {
        const line = current.get(item.lineItemId);
        if (!line) throw notFound('Line item');
        const remaining = remainingToFulfil(line);
        if (item.quantity > remaining) {
          throw conflict(`Only ${remaining} of "${line.title}" is left to fulfil.`, 'lineItems');
        }
      }

      await tx.fulfillment.create({
        data: {
          id: fulfillmentId,
          shopId,
          orderId,
          locationId: data.locationId,
          status: 'success',
          trackingNumber: data.trackingNumber ?? null,
          trackingUrl: data.trackingUrl ?? null,
          trackingCompany: data.trackingCompany ?? null,
          lineItems: requested,
          notifyCustomer: data.notifyCustomer ?? true,
        },
      });

      const after = new Map(lines.map((l) => [l.id, l.fulfilledQuantity]));
      for (const item of requested) {
        await tx.orderLineItem.update({
          where: { id: item.lineItemId },
          data: { fulfilledQuantity: { increment: item.quantity } },
        });
        after.set(item.lineItemId, (after.get(item.lineItemId) ?? 0) + item.quantity);
      }

      const status = fulfillmentStatusFor(
        lines.map((l) => ({
          quantity: l.quantity,
          fulfilledQuantity: after.get(l.id) ?? 0,
          refundedQuantity: l.refundedQuantity,
        })),
      );

      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: status,
          events: {
            create: [
              {
                id: newId('event'),
                shopId,
                type: 'fulfillment_created',
                message: `${count} ${count === 1 ? 'item' : 'items'} fulfilled from ${location.name}.`,
                actor,
                payload: { fulfillmentId, locationId: data.locationId },
              },
            ],
          },
        },
      });
      return status;
    });
  } catch (error) {
    // The stock moved in its own committed transaction (the adjustment service
    // runs one; it cannot nest here). A fulfillment that then fails must put
    // the stock back, or the shelf count is short against no shipment at all.
    if (stockMoves.length > 0) {
      try {
        await adjustMany(
          db,
          stockMoves.map((move) => ({ ...move, delta: -move.delta, reason: 'restock' as const })),
        );
      } catch (compensation) {
        console.warn(
          `fulfill: could not return stock for failed fulfillment ${fulfillmentId} — ${
            compensation instanceof Error ? compensation.message : String(compensation)
          }`,
        );
      }
    }
    throw error;
  }

  if (fulfillmentStatus === 'fulfilled') {
    await notifyOrder({
      shopId,
      topic: 'orders/fulfilled',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        total: order.total,
        currencyCode: order.currencyCode,
      },
    });
  }

  return loadOrderDetail(db, orderId);
}
