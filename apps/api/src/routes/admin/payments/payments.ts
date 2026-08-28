/**
 * Payments: the list an order page shows, and the actions on one (SPEC §11).
 * Owner: WS-D. Mounted at /admin/api/payments by the autoloader.
 *
 * NOTE: this directory deliberately has no `index.ts`. @fastify/autoload treats
 * a directory's index file as the whole directory and skips its siblings, so an
 * `index.ts` here would silently unregister processors.ts and routing-rules.ts.
 *
 * Order-level refunds are NOT here — C3 owns `POST /admin/api/orders/:id/refunds`
 * and calls `refundPayment` from `@merchant/pay/router` directly, so the refund
 * cap and the refund row are computed in exactly one place.
 */
import { paginationQuery } from '@merchant/contracts/common';
import { capturePaymentInput, chargeSavedCardInput, paymentSchema } from '@merchant/contracts/pay';
import { capturePayment, chargeSavedCard, PaymentError, voidPayment } from '@merchant/pay/router';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import { notifyOrderPaid } from '../../../services/orders/notify.ts';

const listQuery = paginationQuery.extend({
  orderId: z.string().optional(),
  checkoutId: z.string().optional(),
});

/** PaymentError carries the SPEC §5 code already; this is the whole mapping. */
function asApiError(error: unknown): never {
  if (error instanceof PaymentError) throw new ApiError(error.code, error.message);
  throw error;
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    return asApiError(error);
  }
}

interface PaymentRow {
  id: string;
  orderId: string | null;
  checkoutId: string | null;
  amount: number;
  refundedAmount: number;
  currencyCode: string;
  status: string;
  processor: string;
  processorTxnId: string | null;
  cardTokenId: string | null;
  last4: string | null;
  brand: string | null;
  errorCode: string | null;
  routingTrail: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const toPayment = (row: PaymentRow) =>
  paymentSchema.parse({
    id: row.id,
    orderId: row.orderId,
    checkoutId: row.checkoutId,
    amount: { amount: row.amount, currencyCode: row.currencyCode },
    refundedAmount: { amount: row.refundedAmount, currencyCode: row.currencyCode },
    status: row.status,
    processor: row.processor,
    processorTxnId: row.processorTxnId,
    cardTokenId: row.cardTokenId,
    last4: row.last4,
    brand: row.brand,
    errorCode: row.errorCode,
    routingTrail: row.routingTrail ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

export default async function routes(app: FastifyInstance) {
  app.get('/', { preHandler: requirePermission('orders') }, async (request) => {
    const { limit, cursor, orderId, checkoutId } = listQuery.parse(request.query ?? {});

    // ULIDs sort chronologically (packages/config/ids.ts), so `id` alone is a
    // stable cursor — no secondary sort key needed.
    const rows = await request.db.payment.findMany({
      where: {
        ...(orderId ? { orderId } : {}),
        ...(checkoutId ? { checkoutId } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    return {
      data: page.map(toPayment),
      nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    };
  });

  app.post('/:id/capture', { preHandler: requirePermission('orders') }, async (request) => {
    const { id } = request.params as { id: string };
    const { amount } = capturePaymentInput.parse(request.body ?? {});
    return run(() => capturePayment(request.db, id, amount));
  });

  app.post('/:id/void', { preHandler: requirePermission('orders') }, async (request) => {
    const { id } = request.params as { id: string };
    return run(() => voidPayment(request.db, id));
  });

  /**
   * The repeat-billing primitive (SPEC §11): charge a card the customer already
   * saved. `orders` rather than `settings` permission — this moves a customer's
   * money, so it belongs to whoever is allowed to work an order.
   */
  app.post('/charge-saved-card', { preHandler: requirePermission('orders') }, async (request) => {
    const input = chargeSavedCardInput
      .extend({ orderId: z.string().optional(), checkoutId: z.string().optional() })
      .parse(request.body ?? {});

    return run(() =>
      chargeSavedCard(
        request.db,
        request.shopId as string,
        {
          paymentMethodId: input.paymentMethodId,
          amount: input.amount,
          idempotencyKey: input.idempotencyKey,
          orderId: input.orderId ?? null,
          checkoutId: input.checkoutId ?? null,
        },
        // D3's `onPaid` seam: emits `orders/paid` once the Payment row is
        // committed. Its failures are swallowed, so it cannot fail the charge.
        { onPaid: notifyOrderPaid },
      ),
    );
  });
}
