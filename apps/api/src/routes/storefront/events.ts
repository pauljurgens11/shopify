/**
 * `POST /storefront/api/events` — the analytics beacon (SPEC §13). Owner: WS-E.
 *
 * Ingestion glue only: rows go in, nothing comes back out. G2 owns rollups and
 * every query over this table.
 *
 * `purchase` is deliberately accepted from the browser but recorded
 * server-side at order creation as well — the contract says the server-side one
 * is authoritative, because a beacon is trivially forgeable and revenue must
 * not be.
 */
import { newId } from '@merchant/config/ids';
import { ingestEventsInput } from '@merchant/contracts/analytics';
import type { FastifyInstance } from 'fastify';
import { requireShop } from '../../plugins/tenancy.ts';
import { privateResponse } from '../../services/storefront/cache.ts';

export default async function routes(app: FastifyInstance) {
  app.post('/events', async (request, reply) => {
    const { events } = ingestEventsInput.parse(request.body);
    const shopId = requireShop(request);

    await request.db.analyticsEvent.createMany({
      data: events.map((event) => ({
        id: newId('event'),
        shopId,
        type: event.type,
        sessionId: event.sessionId,
        path: event.path,
        productId: event.productId ?? null,
        orderId: event.orderId ?? null,
        value: event.value?.amount ?? null,
        // The browser's clock is not trusted for ordering, but a batch sent on
        // unload can legitimately describe events from a minute ago.
        occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
      })),
    });

    privateResponse(reply);
    // 202: the write has happened, but there is deliberately nothing to return.
    return reply.status(202).send();
  });
}
