/**
 * `POST /storefront/api/events` — the analytics beacon (SPEC §13). Owner: WS-E.
 *
 * Ingestion glue only: rows go in, nothing comes back out. G2 owns rollups and
 * every query over this table.
 *
 * `purchase` events are DROPPED here. The contract calls the server-side one
 * authoritative "never trusted from here", and this endpoint is unauthenticated
 * and Host-resolved: anyone who can curl it could otherwise mint revenue into a
 * merchant's dashboard. `recordPurchaseEvent` writes the real one at order
 * creation. Dropped rather than rejected, because `purchase` is a legal member
 * of the contract's event enum and a beacon must not fail on a legal payload.
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

    const trusted = events.filter((event) => event.type !== 'purchase');

    await request.db.analyticsEvent.createMany({
      data: trusted.map((event) => ({
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
