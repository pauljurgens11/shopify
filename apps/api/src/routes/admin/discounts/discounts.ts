/**
 * `/admin/api/discounts` (SPEC §7, §9). Owner: WS-C.
 *
 * Index-free directory: `@fastify/autoload` treats an `index.ts` as the whole
 * directory and silently skips its siblings (AGENT-LOG, WS-D).
 *
 * Persistence only. What a discount is WORTH is `services/discounts/engine.ts`,
 * which is pure and shared with checkout — there is no pricing here to drift.
 */
import { deletedResponse, idParam } from '@merchant/contracts/common';
import { listDiscountsQuery } from '@merchant/contracts/discounts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createDiscount,
  deleteDiscount,
  getDiscount,
  listDiscounts,
  updateDiscount,
} from '../../../services/discounts/crud.ts';

const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('discounts'));

  app.get('/', async (request) =>
    listDiscounts(request.db, listDiscountsQuery.parse(request.query)),
  );

  app.post('/', async (request, reply) => {
    const discount = await createDiscount(request.db, shopIdOf(request), request.body);
    return reply.status(201).send(discount);
  });

  app.get('/:id', async (request) => getDiscount(request.db, idParam.parse(request.params).id));

  app.put('/:id', async (request) =>
    updateDiscount(request.db, idParam.parse(request.params).id, request.body),
  );

  app.delete('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteDiscount(request.db, id);
    return deletedResponse.parse({ id, deleted: true });
  });
}
