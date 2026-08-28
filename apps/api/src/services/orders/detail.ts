/**
 * One loader for the order-detail shape, so the routes and every mutation that
 * returns an order agree on what "the order" includes. C5 renders exactly this.
 *
 * Owner: WS-C.
 */
import type { OrderDetail } from '@merchant/contracts/orders';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';
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
        select: { id: true, email: true, firstName: true, lastName: true, ordersCount: true },
      },
    },
  });
  if (!order) throw notFound('Order');

  // Payments join by orderId rather than by a relation — Pay owns those rows and
  // this only ever reads them.
  const payments = await db.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'asc' },
  });

  return toOrderDetail(order, { payments });
}
