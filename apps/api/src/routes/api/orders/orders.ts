/**
 * `GET /api/orders`, `GET /api/orders/:id` — the public Admin REST API
 * (SPEC §8). Owner: WS-G.
 *
 * Read-only, and not because writes were cut: orders are created by a completed
 * checkout through `services/orders/create.ts`, so there is no write endpoint
 * on the admin side either. Same C2/C5 services, same page shape, same detail
 * DTO as `/admin/api/orders`.
 */
import { listOrdersQuery } from '@merchant/contracts/orders';
import type { FastifyInstance } from 'fastify';
import { adminApiRoute, trackAppUsage } from '../../../lib/scopes.ts';
import { loadOrderDetail } from '../../../services/orders/detail.ts';
import { listOrders } from '../../../services/orders/list.ts';

export default async function routes(app: FastifyInstance) {
  trackAppUsage(app);

  app.get('/', adminApiRoute('read_orders'), async (request) => {
    const query = listOrdersQuery.parse(request.query);
    return listOrders(request.db, query);
  });

  app.get('/:id', adminApiRoute('read_orders'), async (request) => {
    const { id } = request.params as { id: string };
    return loadOrderDetail(request.db, id);
  });
}
