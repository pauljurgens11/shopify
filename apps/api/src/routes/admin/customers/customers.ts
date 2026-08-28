/**
 * `/admin/api/customers` (SPEC §7, §9). Owner: WS-C.
 *
 * The directory is kept index-free on purpose: `@fastify/autoload` treats an
 * `index.ts` as the whole directory and silently skips its siblings, so a
 * second file added here later would 404 with no error (AGENT-LOG, WS-D).
 *
 * Thin by design — the rules live in `services/customers/customers.ts`, so E3's
 * checkout completion and E5's storefront account get the same behaviour
 * without going through HTTP.
 */
import { deletedResponse, idParam } from '@merchant/contracts/common';
import { listCustomersQuery } from '@merchant/contracts/customers';
import { listOrdersQuery } from '@merchant/contracts/orders';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../../../services/customers/customers.ts';
import { listOrders } from '../../../services/orders/list.ts';

/** `request.shopId` is set by the tenancy plugin before requirePermission passes. */
const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('customers'));

  /* ------------------------------------------------------------------ list */
  app.get('/', async (request) =>
    listCustomers(request.db, listCustomersQuery.parse(request.query)),
  );

  /* ---------------------------------------------------------------- create */
  app.post('/', async (request, reply) => {
    const customer = await createCustomer(request.db, shopIdOf(request), request.body);
    return reply.status(201).send(customer);
  });

  /* ---------------------------------------------------------------- detail */
  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return getCustomer(request.db, id);
  });

  app.put('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return updateCustomer(request.db, shopIdOf(request), id, request.body);
  });

  app.delete('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteCustomer(request.db, id);
    return deletedResponse.parse({ id, deleted: true });
  });

  /* ---------------------------------------------------------------- orders */
  // Same shape and the same tab/search rules as the orders index (C2), so the
  // customer page and the orders page cannot disagree about an order.
  app.get('/:id/orders', async (request) => {
    const { id } = idParam.parse(request.params);
    const query = listOrdersQuery.parse(request.query);
    return listOrders(request.db, { ...query, customerId: id });
  });
}
