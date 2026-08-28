/**
 * `/admin/api/locations` (SPEC §7). Owner: WS-B.
 *
 * Locations are where stock lives; quantities themselves move only through
 * `services/inventory/adjust.ts`.
 */
import { idParam } from '@merchant/contracts/common';
import {
  createLocationInput,
  locationListResponse,
  updateLocationInput,
} from '@merchant/contracts/locations';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createLocation,
  deleteLocation,
  getLocation,
  listLocations,
  updateLocation,
} from '../../../services/inventory/query.ts';

const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('products'));

  // Unpaginated on purpose: a shop has a handful of locations, and every
  // inventory screen needs all of them to render its columns.
  app.get('/', async (request) =>
    locationListResponse.parse({ data: await listLocations(request.db) }),
  );

  app.post('/', async (request, reply) => {
    const input = createLocationInput.parse(request.body);
    const location = await createLocation(request.db, shopIdOf(request), input);
    return reply.status(201).send(location);
  });

  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return getLocation(request.db, id);
  });

  app.put('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return updateLocation(request.db, id, updateLocationInput.parse(request.body));
  });

  app.delete('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteLocation(request.db, id);
    return { id, deleted: true as const };
  });
}
