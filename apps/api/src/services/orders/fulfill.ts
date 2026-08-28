/**
 * Fulfilling an order (SPEC §9).
 *
 * Shopify's model, and ours: a fulfillment is a shipment, not a flag. It names
 * the location the stock left, the exact quantities, and optionally a tracking
 * number — and the order's `fulfillmentStatus` is derived from the line items
 * afterwards rather than set by hand, so it cannot drift from what was shipped.
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

/** Derived from the lines, never set directly — see the file header. */
function statusFor(lines: Array<{ quantity: number; fulfilledQuantity: number }>): string {
  if (lines.every((l) => l.fulfilledQuantity >= l.quantity)) return 'fulfilled';
  if (lines.some((l) => l.fulfilledQuantity > 0)) return 'partially_fulfilled';
  return 'unfulfilled';
}

export async function fulfillOrder(
  db: TenantClient,
  shopId: string,
  orderId: string,
  input: CreateFulfillmentInput,
  actor: string | null,
): Promise<OrderDetail> {
  const data = createFulfillmentInput.parse(input);

  const order = await db.order.findUnique({ where: { id: orderId }, include: { lineItems: true } });
  if (!order) throw notFound('Order');
  if (order.cancelledAt) throw conflict('This order is cancelled; it cannot be fulfilled.');

  const location = await db.location.findUnique({ where: { id: data.locationId } });
  if (!location) throw notFound('Location');

  const byId = new Map<string, LineRow>(order.lineItems.map((l) => [l.id, l]));
  const requested = data.lineItems.filter((l) => l.quantity > 0);
  if (requested.length === 0) throw badRequest('Choose at least one item to fulfil.', 'lineItems');

  // Validate everything before touching stock: a rejected fulfillment must
  // leave inventory exactly as it found it.
  for (const item of requested) {
    const line = byId.get(item.lineItemId);
    if (!line) throw notFound('Line item');
    const remaining = line.quantity - line.fulfilledQuantity;
    if (item.quantity > remaining) {
      throw conflict(`Only ${remaining} of "${line.title}" is left to fulfil.`, 'lineItems');
    }
  }

  const fulfillmentId = newId('fulfillment');

  // Stock first, and through B4's service so every level change has its
  // adjustment row (CLAUDE.md §9). It is also the step that can legitimately
  // refuse — an oversell on a `deny` variant — and refusing before the
  // Fulfillment row exists is what keeps the two consistent.
  const stockMoves = requested
    .map((item) => ({ item, line: byId.get(item.lineItemId) }))
    .filter((pair): pair is { item: (typeof requested)[number]; line: LineRow } =>
      Boolean(pair.line?.variantId),
    )
    .map(({ item, line }) => ({
      variantId: line.variantId as string,
      locationId: data.locationId,
      delta: -item.quantity,
      reason: 'sold' as const,
      referenceId: fulfillmentId,
      actor,
    }));
  if (stockMoves.length > 0) await adjustMany(db, stockMoves);

  const count = requested.reduce((n, item) => n + item.quantity, 0);

  const fulfillmentStatus = await db.$transaction(async (tx) => {
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

    const after = new Map(order.lineItems.map((l) => [l.id, l.fulfilledQuantity]));
    for (const item of requested) {
      await tx.orderLineItem.update({
        where: { id: item.lineItemId },
        data: { fulfilledQuantity: { increment: item.quantity } },
      });
      after.set(item.lineItemId, (after.get(item.lineItemId) ?? 0) + item.quantity);
    }

    const status = statusFor(
      order.lineItems.map((l) => ({
        quantity: l.quantity,
        fulfilledQuantity: after.get(l.id) ?? 0,
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
