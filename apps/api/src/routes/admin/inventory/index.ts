/**
 * `/admin/api/inventory` (SPEC §7). Owner: WS-B.
 *
 * The write routes are a thin shell over `services/inventory/adjust.ts`, which
 * is the only thing in the codebase allowed to move a quantity — other
 * workstreams import that service rather than posting here.
 */
import {
  adjustInventoryBody,
  inventoryLevelsResponse,
  listInventoryQuery,
  setInventoryBody,
} from '@merchant/contracts/inventory';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../../../lib/permissions.ts';
import { adjustMany, setMany } from '../../../services/inventory/adjust.ts';
import { listInventory } from '../../../services/inventory/query.ts';

/** Both write endpoints take one change or a batch; normalise to the batch. */
const many = <T>(body: { adjustments: T[] } | { levels: T[] } | T): T[] => {
  if (body && typeof body === 'object') {
    if ('adjustments' in body) return body.adjustments;
    if ('levels' in body) return body.levels;
  }
  return [body as T];
};

/** Stamped on every history row, so the stock drawer can say who did it. */
const actorOf = (request: FastifyRequest): string | null => request.staffUserId ?? null;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('products'));

  app.get('/', async (request) =>
    listInventory(request.db, listInventoryQuery.parse(request.query)),
  );

  app.post('/adjust', async (request) => {
    const inputs = many(adjustInventoryBody.parse(request.body));
    const levels = await adjustMany(
      request.db,
      inputs.map((input) => ({ ...input, actor: actorOf(request) })),
    );
    return inventoryLevelsResponse.parse({ levels });
  });

  app.post('/set', async (request) => {
    const inputs = many(setInventoryBody.parse(request.body));
    const levels = await setMany(
      request.db,
      inputs.map((input) => ({ ...input, actor: actorOf(request) })),
    );
    return inventoryLevelsResponse.parse({ levels });
  });
}
