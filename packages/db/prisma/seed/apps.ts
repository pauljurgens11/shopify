/**
 * One demo app with a webhook subscription and a lived-in delivery log
 * (issue H5). Without it the Apps page opens on its empty state and the
 * "webhook demo" beat (SPEC §16, G deliverable) needs live setup on stage.
 *
 * The token is stored HASHED only, mirroring `services/apps/apps.ts`
 * (SHA-256 + last-4 suffix) — `packages/db` cannot import `apps/api`, the
 * same one-way street as the vault blob in `pay.ts` (DECISIONS.md). The
 * plaintext is minted and dropped: nobody needs to authenticate as the demo
 * app, they need the page to read real.
 *
 * The subscription URL is the worker's echo receiver
 * (`pnpm --filter @merchant/worker run echo`, port 4100), so "Send test
 * event" works live against seeded data the moment that script is running.
 */
import { createHash } from 'node:crypto';
import { newApiToken, newId, newSecret } from '@merchant/config/ids';
import type { PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';
import type { SeededCustomer } from './customers.ts';
import type { SeededOrder } from './orders.ts';

const WEBHOOK_URL = 'http://localhost:4100/webhooks';
const DELIVERY_COUNT = 3;

export async function createDemoApp(
  db: PrismaClient,
  ctx: SeedContext,
  input: { customers: SeededCustomer[]; orders: SeededOrder[] },
): Promise<void> {
  const installedAt = daysAgo(ctx, 14, 9, 30);
  const apiToken = newApiToken();

  const app = await db.app.create({
    data: {
      id: newId('app'),
      shopId: ctx.shopId,
      name: 'Warehouse Sync',
      scopes: ['read_orders', 'read_products'],
      apiTokenHash: createHash('sha256').update(apiToken).digest('hex'),
      tokenSuffix: apiToken.slice(-4),
      createdAt: installedAt,
      updatedAt: installedAt,
      lastUsedAt: daysAgo(ctx, 1, 16, 45),
    },
  });

  const secret = `whsec_${newSecret(24)}`;
  const subscription = await db.webhookSubscription.create({
    data: {
      id: newId('webhook'),
      shopId: ctx.shopId,
      appId: app.id,
      topic: 'orders/create',
      url: WEBHOOK_URL,
      secret,
      secretSuffix: secret.slice(-4),
      createdAt: installedAt,
      updatedAt: installedAt,
    },
  });

  // Delivered rows for the newest orders placed AFTER the app was installed —
  // a log older than its subscription reads as fabricated.
  const emailByCustomer = new Map(input.customers.map((c) => [c.id, c.email]));
  const delivered = input.orders
    .filter((order) => !order.cancelled && order.createdAt > installedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, DELIVERY_COUNT);

  for (const order of delivered) {
    const deliveredAt = new Date(order.createdAt.getTime() + 90 * 1000);
    await db.webhookDelivery.create({
      data: {
        id: newId('event'),
        shopId: ctx.shopId,
        subscriptionId: subscription.id,
        eventId: newId('event'),
        topic: 'orders/create',
        // Mirrors `orderPayload` in services/orders/notify.ts: total as a
        // Money object, never a bare minor-unit integer (DECISIONS.md).
        payload: {
          id: order.id,
          orderNumber: order.orderNumber,
          email: emailByCustomer.get(order.customerId) ?? null,
          total: { amount: order.total, currencyCode: ctx.currencyCode },
        },
        status: 'success',
        attempts: 1,
        responseStatus: 200,
        deliveredAt,
        createdAt: deliveredAt,
        updatedAt: deliveredAt,
      },
    });
  }
}
