/**
 * The one trustworthy `purchase` event (SPEC §13). Owner: WS-G.
 *
 * Written server-side at order creation because the beacon endpoint is
 * unauthenticated and Host-resolved — it drops browser-sent `purchase` events
 * for exactly this reason. Revenue on the dashboard traces back to an Order row
 * or it does not exist.
 *
 * `sessionId` is synthesised from the order rather than taken from the browser:
 * the funnel counts DISTINCT sessions, and a checkout that never sent a beacon
 * still has to count as one.
 */
import { newId } from '@merchant/config/ids';
import type { TenantClient } from '@merchant/db/tenant';

export type PurchaseRecord = {
  orderId: string;
  orderNumber: number;
  /** Order total in minor units. */
  total: number;
  createdAt: Date;
};

export async function recordPurchaseEvent(
  db: TenantClient,
  shopId: string,
  order: PurchaseRecord,
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        id: newId('event'),
        // Redundant at runtime — the tenant client stamps it — but Prisma's
        // generated create input still requires it (docs/AGENT-LOG.md).
        shopId,
        type: 'purchase',
        // Matches the seed's convention, so seeded and live purchases look the
        // same to every query over this table.
        sessionId: `ses_order_${order.orderNumber}`,
        path: '/checkout/complete',
        orderId: order.orderId,
        value: order.total,
        occurredAt: order.createdAt,
      },
    });
  } catch (err) {
    // Analytics must never be the reason a committed order fails its request.
    console.warn(
      `analytics: purchase event for ${order.orderId} not recorded — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
