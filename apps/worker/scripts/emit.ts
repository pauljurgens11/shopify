/**
 * Enqueue a job by hand, to watch the worker do its thing (issue G1 test plan).
 * Owner: WS-G. Development tool — not wired into the running stack.
 *
 *   pnpm --filter @merchant/worker run emit -- webhook demo orders/create
 *   pnpm --filter @merchant/worker run emit -- email demo
 */
import { WEBHOOK_TOPICS, type WebhookTopic } from '@merchant/config/constants';
import {
  closeQueues,
  emitWebhookEvent,
  enqueueOrderConfirmationEmail,
} from '@merchant/config/queue';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';

const [mode, shopSlug, topicArg] = process.argv.slice(2);

function usage(message: string): never {
  console.error(`${message}

  emit webhook <shop-slug> <topic>   topics: ${WEBHOOK_TOPICS.join(', ')}
  emit email   <shop-slug>           mails the shop's newest order`);
  process.exit(1);
}

if (mode !== 'webhook' && mode !== 'email') usage('First argument must be "webhook" or "email".');
if (!shopSlug) usage('Missing shop slug (try "demo").');

// Resolving a slug to a shop is a platform-level lookup — one of the sanctioned
// uses of the unscoped client (SPEC §6).
const shop = await dbAdmin.shop.findUnique({ where: { slug: shopSlug }, select: { id: true } });
if (!shop) usage(`No shop with slug "${shopSlug}".`);

const db = dbForShop(shop.id);
const newestOrder = await db.order.findFirst({
  orderBy: { createdAt: 'desc' },
  select: { id: true, orderNumber: true, email: true, total: true, currencyCode: true },
});

if (mode === 'email') {
  if (!newestOrder) usage(`Shop "${shopSlug}" has no orders to mail.`);
  const queued = await enqueueOrderConfirmationEmail(shop.id, newestOrder.id);
  console.log(
    queued
      ? `queued confirmation email for order #${newestOrder.orderNumber}`
      : 'not queued — is Redis up?',
  );
} else {
  const topic = topicArg as WebhookTopic;
  if (!WEBHOOK_TOPICS.includes(topic)) usage(`Unknown topic "${topicArg}".`);

  // A stand-in resource body: real emitters pass the contract-shaped resource.
  const data = newestOrder
    ? {
        id: newestOrder.id,
        orderNumber: newestOrder.orderNumber,
        email: newestOrder.email,
        total: { amount: newestOrder.total, currencyCode: newestOrder.currencyCode },
      }
    : { id: shop.id };

  const queued = await emitWebhookEvent(shop.id, topic, data);
  console.log(queued ? `queued ${topic} for ${shopSlug}` : 'not queued — is Redis up?');
}

await closeQueues();
await dbAdmin.$disconnect();
