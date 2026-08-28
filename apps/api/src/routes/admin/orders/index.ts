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
  listOrdersQuery,
  updateOrderInput,
} from '@merchant/contracts/orders';
import { Prisma } from '@merchant/db/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import { cancelOrder } from '../../../services/orders/cancel.ts';
import { listOrders } from '../../../services/orders/list.ts';
import { toOrderDetail } from '../../../services/orders/serialize.ts';

/** Who to attribute a timeline entry to. Staff email is what C5 shows. */
async function actorFor(request: FastifyRequest): Promise<string | null> {
  if (!request.staffUserId) return null;
  const user = await request.db.staffUser.findUnique({
    where: { id: request.staffUserId },
    select: { email: true },
  });
  return user?.email ?? null;
}

async function loadDetail(request: FastifyRequest, id: string) {
  const order = await request.db.order.findUnique({
    where: { id },
    include: {
      lineItems: true,
      events: { orderBy: { createdAt: 'asc' } },
      customer: {
        select: { id: true, email: true, firstName: true, lastName: true, ordersCount: true },
      },
    },
  });
  if (!order) throw notFound('Order');

  // Payments are joined by orderId rather than by a relation — Pay owns those
  // rows and this endpoint only reads them.
  const payments = await request.db.payment.findMany({
    where: { orderId: id },
    orderBy: { createdAt: 'asc' },
  });

  return toOrderDetail(order, { payments });
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
    return loadDetail(request, id);
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

    return loadDetail(request, id);
  });

  /* ---------------------------------------------------------------- cancel */
  app.post('/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    const input = cancelOrderInput.parse(request.body ?? {});
    // requireShop already ran: an admin route without a shop never gets here.
    return cancelOrder(request.db, request.shopId as string, id, input, await actorFor(request));
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
