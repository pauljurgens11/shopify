/**
 * `/admin/api/analytics` (SPEC §13). Owner: WS-G.
 *
 * One call returns the whole dashboard. The contract already describes it as a
 * single `analyticsDashboardResponse`, and G3's page renders every card at once
 * — four endpoints would mean four loading states on one screen for no gain.
 * `/live` is separate because it alone is polled.
 */
import { analyticsDashboardResponse, analyticsRangeQuery } from '@merchant/contracts/analytics';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../../lib/permissions.ts';
import { getDashboard, getLiveView } from '../../../services/analytics/dashboard.ts';

const liveViewResponse = z.object({
  visitors: z.number().int().nonnegative(),
  ordersToday: z.number().int().nonnegative(),
});

export default async function routes(app: FastifyInstance) {
  app.get('/', { preHandler: requirePermission('analytics') }, async (request) => {
    const query = analyticsRangeQuery.parse(request.query);

    const dashboard = await getDashboard(request.db, request.shopId as string, {
      from: new Date(query.from),
      to: new Date(query.to),
    });

    return analyticsDashboardResponse.parse(dashboard);
  });

  app.get('/live', { preHandler: requirePermission('analytics') }, async (request) => {
    return liveViewResponse.parse(await getLiveView(request.db));
  });
}
