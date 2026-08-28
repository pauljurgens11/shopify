/**
 * One loader for the order-detail shape, so the routes and every mutation that
 * returns an order agree on what "the order" includes. C5 renders exactly this.
 *
 * Owner: WS-C.
 */
import type { OrderDetail } from '@merchant/contracts/orders';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';
import { aggregatesFor } from '../customers/customers.ts';
import { toOrderDetail } from './serialize.ts';

export async function loadOrderDetail(db: TenantClient, orderId: string): Promise<OrderDetail> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      lineItems: true,
      events: { orderBy: { createdAt: 'asc' } },
      fulfillments: { orderBy: { createdAt: 'asc' } },
      refunds: { orderBy: { createdAt: 'asc' } },
      customer: {
        // `ordersCount` is DERIVED below via C4's aggregate — the row's column
        // is deliberately unused (DECISIONS) and reads 0 for any customer a
        // live checkout created.
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  if (!order) throw notFound('Order');

  const aggregates = order.customer
    ? await aggregatesFor(db, [order.customer.id])
    : new Map<string, { ordersCount: number }>();
  const customer = order.customer
    ? {
        ...order.customer,
        ordersCount: aggregates.get(order.customer.id)?.ordersCount ?? 0,
      }
    : null;

  // Payments join by orderId rather than by a relation — Pay owns those rows and
  // this only ever reads them.
  const payments = await db.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
  });

  return toOrderDetail({ ...order, customer }, { payments });
}
