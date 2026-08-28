/**
 * `GET /api/customers`, `GET /api/customers/:id` — the public Admin REST API
 * (SPEC §8). Owner: WS-G.
 *
 * Read-only in this first subset: the customer record an integration cares
 * about is the one checkout already created, and a write surface over PII is
 * the last thing worth adding before the demo. Same C4 service, so the
 * order-count and total-spent aggregates are the ones the admin shows.
 */
import { idParam } from '@merchant/contracts/common';
import { listCustomersQuery } from '@merchant/contracts/customers';
import type { FastifyInstance } from 'fastify';
import { adminApiRoute, trackAppUsage } from '../../../lib/scopes.ts';
import { getCustomer, listCustomers } from '../../../services/customers/customers.ts';

export default async function routes(app: FastifyInstance) {
  trackAppUsage(app);

  app.get('/', adminApiRoute('read_customers'), async (request) =>
    listCustomers(request.db, listCustomersQuery.parse(request.query)),
  );

  app.get('/:id', adminApiRoute('read_customers'), async (request) => {
    const { id } = idParam.parse(request.params);
    return getCustomer(request.db, id);
  });
}
