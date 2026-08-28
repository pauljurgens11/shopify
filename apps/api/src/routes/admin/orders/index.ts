/**
 * Admin orders API (SPEC §9) — the index, the detail page, cancel, and the
 * timeline comment box. C5 renders all four.
 *
 * Writing an order is deliberately not here: orders come from a completed
 * checkout via `services/orders/create.ts`, which E3 calls. There is no
 * "create order" endpoint to keep in sync with it.
 *
 * Owner: WS-C.
 */
import { newId } from '@merchant/config/ids';
import {
  addOrderNoteInput,
  cancelOrderInput,
  createFulfillmentInput,
  createRefundInput,
  listOrdersQuery,
  updateOrderInput,
} from '@merchant/contracts/orders';
import { Prisma } from '@merchant/db/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import { cancelOrder } from '../../../services/orders/cancel.ts';
import { loadOrderDetail } from '../../../services/orders/detail.ts';
import { fulfillOrder } from '../../../services/orders/fulfill.ts';
import { listOrders } from '../../../services/orders/list.ts';
import { previewRefund, refundOrder } from '../../../services/orders/refund.ts';

/** Who to attribute a timeline entry to. Staff email is what C5 shows. */
async function actorFor(request: FastifyRequest): Promise<string | null> {
  if (!request.staffUserId) return null;
  const user = await request.db.staffUser.findUnique({
    where: { id: request.staffUserId },
    select: { email: true },
  });
  return user?.email ?? null;
}

export default async function routes(app: FastifyInstance) {
  // Scoped to this plugin by autoload's encapsulation, so a route added to this
  // file cannot forget it.
  app.addHook('preHandler', requirePermission('orders'));

  /* ----------------------------------------------------------------- index */
  app.get('/', async (request) => {
    const query = listOrdersQuery.parse(request.query);
    return listOrders(request.db, query);
  });

  /* ---------------------------------------------------------------- detail */
  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return loadOrderDetail(request.db, id);
  });

  /* ------------------------------------------------- note / tags / contact */
  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const input = updateOrderInput.parse(request.body);

    const { count } = await request.db.order.updateMany({
      where: { id },
      data: {
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        // Clearing a nullable Json column needs Prisma.DbNull; plain `null`
        // there is a type error and `undefined` would silently keep the old
        // address.
        ...(input.shippingAddress !== undefined
          ? { shippingAddress: input.shippingAddress ?? Prisma.DbNull }
          : {}),
      },
    });
    if (count === 0) throw notFound('Order');

    return loadOrderDetail(request.db, id);
  });

  /* ---------------------------------------------------------------- cancel */
  app.post('/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    const input = cancelOrderInput.parse(request.body ?? {});
    // requireShop already ran: an admin route without a shop never gets here.
    return cancelOrder(request.db, request.shopId as string, id, input, await actorFor(request));
  });

  /* ----------------------------------------------------------- fulfilment */
  app.post('/:id/fulfillments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createFulfillmentInput.parse(request.body);
    const order = await fulfillOrder(
      request.db,
      request.shopId as string,
      id,
      input,
      await actorFor(request),
    );
    return reply.status(201).send(order);
  });

  /* --------------------------------------------------------------- refunds */
  // Preview first: C5's refund form shows these numbers before the merchant
  // commits, the same way Shopify does, and it must be the same arithmetic.
  app.post('/:id/refunds/calculate', async (request) => {
    const { id } = request.params as { id: string };
    const input = createRefundInput.partial().parse(request.body ?? {});
    return previewRefund(request.db, id, {
      lineItems: input.lineItems,
      shippingAmount: input.shippingAmount?.amount,
    });
  });

  app.post('/:id/refunds', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createRefundInput.parse(request.body);
    const order = await refundOrder(
      request.db,
      request.shopId as string,
      id,
      input,
      await actorFor(request),
    );
    return reply.status(201).send(order);
  });

  /* -------------------------------------------------------- timeline note */
  app.post('/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addOrderNoteInput.parse(request.body);

    const order = await request.db.order.findUnique({ where: { id }, select: { id: true } });
    if (!order) throw notFound('Order');

    const event = await request.db.orderEvent.create({
      data: {
        id: newId('event'),
        // Stamped by the tenant client at runtime; Prisma's types still want it.
        shopId: request.shopId as string,
        orderId: order.id,
        type: 'note_added',
        message: input.message,
        actor: await actorFor(request),
      },
    });

    return reply.status(201).send({
      id: event.id,
      orderId: event.orderId,
      type: event.type,
      message: event.message,
      actor: event.actor,
      payload: event.payload ?? {},
      createdAt: event.createdAt.toISOString(),
    });
  });
}
