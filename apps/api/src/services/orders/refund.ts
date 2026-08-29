/**
 * Refunding an order (SPEC §9, §11).
 *
 * The arithmetic is the point. A line's refundable value is its price less the
 * share of the discount that was allocated to it, and refunding part of a
 * multi-unit line has to split that net across units the same way `allocate`
 * splits an order discount across lines — otherwise two half-refunds do not add
 * up to one whole one, and the merchant is out a cent per order forever.
 *
 * The money itself goes back through Pay (D3), against the transaction that
 * captured it. This module never picks a processor and never retries one.
 *
 * Owner: WS-C.
 */

import { newId } from '@merchant/config/ids';
import { allocate, format, money } from '@merchant/config/money';
import {
  type CreateRefundInput,
  createRefundInput,
  type OrderDetail,
  type RefundCalculation,
} from '@merchant/contracts/orders';
import {
  type OrderLineItem as LineRow,
  type Order as OrderRow,
  Prisma,
  type Refund as RefundRow,
} from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { PaymentError, refundPayment } from '@merchant/pay/router';
import { ApiError, badRequest, conflict, notFound } from '../../lib/errors.ts';
import { adjustMany } from '../inventory/adjust.ts';
import { loadOrderDetail } from './detail.ts';
import { fulfillmentStatusFor } from './fulfill.ts';
import { notifyOrder } from './notify.ts';

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

type OrderWithLines = OrderRow & { lineItems: LineRow[]; refunds: RefundRow[] };

/**
 * What each unit of a line is worth back, largest-remainder split so the units
 * sum to exactly the line's net. Unit `n` is the (n+1)-th to be refunded, which
 * is what makes successive partial refunds compose.
 */
function unitValues(line: LineRow, currencyCode: string): number[] {
  const net = line.price * line.quantity - line.totalDiscount;
  return allocate(
    money(net, currencyCode),
    Array.from({ length: line.quantity }, () => 1),
  ).map((m) => m.amount);
}

/**
 * Tax lives on the order, not the lines (checkout prices it once over the
 * discounted base), so a refund allocates it the same way: across taxable
 * lines by net, then across a line's units — largest remainder both times.
 * Refunding every unit therefore returns exactly `order.taxTotal`, which is
 * what lets a fully-returned order reach `refunded` rather than sticking at
 * `partially_refunded` one tax-total short.
 */
function unitTaxValues(order: OrderWithLines, currencyCode: string): Map<string, number[]> {
  const weights = order.lineItems.map((line) =>
    line.taxable ? Math.max(0, line.price * line.quantity - line.totalDiscount) : 0,
  );
  const perLine = allocate(money(order.taxTotal, currencyCode), weights);
  return new Map(
    order.lineItems.map((line, i) => [
      line.id,
      allocate(
        perLine[i] ?? money(0, currencyCode),
        Array.from({ length: line.quantity }, () => 1),
      ).map((m) => m.amount),
    ]),
  );
}

/**
 * The suggested refund for a request, and the ceiling it has to fit under.
 * Pure: `POST /:id/refunds/calculate` returns this, and the refund itself is
 * computed from the same function, so the preview cannot disagree with the
 * charge.
 */
export function calculateRefund(
  order: OrderWithLines,
  input: { lineItems?: Array<{ lineItemId: string; quantity: number }>; shippingAmount?: number },
): RefundCalculation {
  const currency = order.currencyCode;
  const byId = new Map(order.lineItems.map((l) => [l.id, l]));
  const taxUnits = unitTaxValues(order, currency);
  let taxAmount = 0;

  const lineItems = (input.lineItems ?? [])
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const line = byId.get(item.lineItemId);
      if (!line) throw notFound('Line item');

      const remaining = line.quantity - line.refundedQuantity;
      if (item.quantity > remaining) {
        throw conflict(`Only ${remaining} of "${line.title}" is left to refund.`, 'lineItems');
      }

      const units = unitValues(line, currency);
      const amount = units
        .slice(line.refundedQuantity, line.refundedQuantity + item.quantity)
        .reduce((total, unit) => total + unit, 0);

      taxAmount += (taxUnits.get(line.id) ?? [])
        .slice(line.refundedQuantity, line.refundedQuantity + item.quantity)
        .reduce((total, unit) => total + unit, 0);

      return { lineItemId: line.id, quantity: item.quantity, amount: money(amount, currency) };
    });

  const shippingRefunded = order.refunds.reduce((total, r) => total + r.shippingAmount, 0);
  const shippingLeft = order.shippingTotal - shippingRefunded;
  const shippingAmount = input.shippingAmount ?? 0;
  if (shippingAmount > shippingLeft) {
    throw conflict(`Only ${shippingLeft} of shipping is left to refund.`, 'shippingAmount');
  }
  if (shippingAmount < 0) throw badRequest('Shipping refund cannot be negative.', 'shippingAmount');

  const subtotal = lineItems.reduce((total, l) => total + l.amount.amount, 0);

  return {
    lineItems,
    shippingAmount: money(shippingAmount, currency),
    subtotal: money(subtotal, currency),
    taxAmount: money(taxAmount, currency),
    total: money(subtotal + taxAmount + shippingAmount, currency),
    maximumRefundable: money(order.total - order.refundedTotal, currency),
  };
}

async function loadRefundable(db: TenantClient, orderId: string): Promise<OrderWithLines> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { lineItems: true, refunds: true },
  });
  if (!order) throw notFound('Order');
  return order;
}

export async function previewRefund(
  db: TenantClient,
  orderId: string,
  input: { lineItems?: Array<{ lineItemId: string; quantity: number }>; shippingAmount?: number },
): Promise<RefundCalculation> {
  return calculateRefund(await loadRefundable(db, orderId), input);
}

export async function refundOrder(
  db: TenantClient,
  shopId: string,
  orderId: string,
  input: CreateRefundInput,
  actor: string | null,
): Promise<OrderDetail> {
  const data = createRefundInput.parse(input);
  const order = await loadRefundable(db, orderId);

  // This function owns refund idempotency end-to-end. The Pay router replays a
  // processor refund by key on its own, so without this check a replayed
  // request would still mint a SECOND Refund row and double-count the totals.
  if (data.idempotencyKey) {
    const replayed = await db.refund.findFirst({
      where: { orderId, idempotencyKey: data.idempotencyKey },
      select: { id: true },
    });
    if (replayed) return loadOrderDetail(db, orderId);
  }

  if (data.shippingAmount && data.shippingAmount.currencyCode !== order.currencyCode) {
    throw badRequest('Shipping refund currency must match the order.', 'shippingAmount');
  }

  const calculation = calculateRefund(order, {
    lineItems: data.lineItems,
    shippingAmount: data.shippingAmount?.amount,
  });

  const amount = calculation.total.amount;
  if (amount <= 0) throw badRequest('There is nothing to refund.', 'lineItems');
  if (amount > calculation.maximumRefundable.amount) {
    throw conflict(
      `Only ${calculation.maximumRefundable.amount} is left to refund on this order.`,
      'lineItems',
    );
  }

  // The money goes back to the transaction that took it. Picking a processor —
  // or failing over to another one — is Pay's business and must not happen here.
  const payment = await db.payment.findFirst({
    where: { orderId, status: { in: ['captured', 'partially_refunded'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!payment) throw conflict('This order has no captured payment to refund.');

  const refundId = newId('refund');
  // One key covers the processor call AND the Refund row. When the client sent
  // none, the refund's own id is the key — correctly prefixed, unique, and
  // stable for this attempt only (a retry without a key is a new refund).
  const idempotencyKey = data.idempotencyKey ?? refundId;
  try {
    await refundPayment(db, shopId, payment.id, {
      amount: calculation.total,
      reason: data.reason ?? undefined,
      idempotencyKey,
    });
  } catch (error) {
    // PaymentError already carries a SPEC §5 code; anything else is a real bug.
    if (error instanceof PaymentError) throw new ApiError(error.code, error.message);
    throw error;
  }

  const paymentRefund = await db.paymentRefund.findFirst({ where: { idempotencyKey } });

  try {
    await db.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          id: refundId,
          shopId,
          orderId,
          amount,
          shippingAmount: calculation.shippingAmount.amount,
          reason: data.reason ?? null,
          note: data.note ?? null,
          lineItems: calculation.lineItems.map((l) => ({
            lineItemId: l.lineItemId,
            quantity: l.quantity,
          })),
          restock: data.restock ?? true,
          paymentRefundId: paymentRefund?.id ?? null,
          idempotencyKey,
        },
      });

      for (const line of calculation.lineItems) {
        await tx.orderLineItem.update({
          where: { id: line.lineItemId },
          data: { refundedQuantity: { increment: line.quantity } },
        });
      }

      // `increment`, not read-modify-write: `order` was read before the
      // processor round-trip, and a concurrent refund would lose its update.
      // The statuses are then derived from the POST-increment rows.
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          refundedTotal: { increment: amount },
          events: {
            create: [
              {
                id: newId('event'),
                shopId,
                type: 'refund_created',
                message: `Refunded ${format(money(amount, order.currencyCode))}.`,
                actor,
                payload: { refundId, restock: data.restock ?? true },
              },
            ],
          },
        },
      });
      const lines = await tx.orderLineItem.findMany({ where: { orderId } });
      await tx.order.update({
        where: { id: orderId },
        data: {
          financialStatus:
            updated.refundedTotal >= updated.total ? 'refunded' : 'partially_refunded',
          // Refunded units no longer need shipping: refunding the unshipped
          // remainder of a partially fulfilled order completes it.
          fulfillmentStatus: fulfillmentStatusFor(lines),
        },
      });
    });
  } catch (error) {
    // Two requests raced on one idempotency key past the check above; the
    // winner's row IS this refund (the processor replayed the same money), so
    // the loser reports the same outcome rather than double-recording it.
    if (isUniqueViolation(error)) return loadOrderDetail(db, orderId);
    throw error;
  }

  // Restocking is a checkbox, not a consequence: refunded is not returned.
  // The money has already moved, so a restock failure must degrade (log and
  // carry on, like notify) rather than 500 a refund that succeeded.
  if (data.restock ?? true) {
    try {
      const byId = new Map(order.lineItems.map((l) => [l.id, l]));
      const moves = calculation.lineItems
        .map((l) => ({ line: byId.get(l.lineItemId), quantity: l.quantity }))
        .filter((m): m is { line: LineRow; quantity: number } => Boolean(m.line?.variantId));

      const levels = await db.inventoryLevel.findMany({
        where: { variantId: { in: moves.map((m) => m.line.variantId as string) } },
        orderBy: [{ variantId: 'asc' }, { locationId: 'asc' }],
      });
      const locationFor = new Map<string, string>();
      for (const level of levels) {
        if (!locationFor.has(level.variantId)) locationFor.set(level.variantId, level.locationId);
      }

      const adjustments = moves
        .map((m) => ({ m, locationId: locationFor.get(m.line.variantId as string) }))
        .filter((pair): pair is { m: typeof pair.m; locationId: string } =>
          Boolean(pair.locationId),
        )
        .map(({ m, locationId }) => ({
          variantId: m.line.variantId as string,
          locationId,
          delta: m.quantity,
          reason: 'restock' as const,
          referenceId: refundId,
          actor,
        }));
      if (adjustments.length > 0) await adjustMany(db, adjustments);
    } catch (error) {
      console.warn(
        `refund: restock for ${refundId} failed — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  await notifyOrder({
    shopId,
    topic: 'refunds/create',
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
      currencyCode: order.currencyCode,
    },
    // The refund itself — the order body alone cannot say what was refunded.
    refund: { id: refundId, amount: calculation.total.amount },
  });

  return loadOrderDetail(db, orderId);
}
