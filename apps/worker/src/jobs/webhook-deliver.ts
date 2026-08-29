/**
 * Deliver one event to every subscription that asked for its topic (SPEC §13).
 * Owner: WS-G.
 *
 * Retries are BullMQ's (5 attempts, exponential backoff, set by the producer):
 * this handler throws on failure and lets the queue decide when to come back.
 * The HTTP attempt itself and the row-state rules live in
 * `lib/webhook-delivery.ts`, which is where the tests drive them.
 */
import { QUEUES, WEBHOOK_MAX_ATTEMPTS } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { JOB_NAMES } from '@merchant/config/queue';
import { webhookEventJobSchema } from '@merchant/contracts/jobs';
import type { WebhookEnvelope } from '@merchant/contracts/webhooks';
import { dbForShop } from '@merchant/db/tenant';
import { logger } from '../lib/logger.ts';
import { nextDeliveryState, postWebhook } from '../lib/webhook-delivery.ts';
import type { JobContext, JobDefinition } from './types.ts';

async function handler(raw: unknown, ctx: JobContext): Promise<void> {
  // A job that sat in Redis across a deploy is untrusted input.
  const event = webhookEventJobSchema.parse(raw);
  const db = dbForShop(event.shopId);

  const shop = await db.shop.findUnique({
    where: { id: event.shopId },
    select: { slug: true },
  });
  if (!shop) {
    logger.warn('webhook event for an unknown shop — dropping', {
      shopId: event.shopId,
      topic: event.topic,
    });
    return;
  }

  const subscriptions = await db.webhookSubscription.findMany({
    where: {
      topic: event.topic,
      isActive: true,
      deletedAt: null,
      app: { uninstalledAt: null },
      // A targeted event (a "send test event" click) goes to that one
      // subscription only — never to other endpoints sharing the topic.
      ...(event.subscriptionId ? { id: event.subscriptionId } : {}),
    },
    select: { id: true, url: true, secret: true },
  });
  if (subscriptions.length === 0) return;

  // A retry must not re-POST to endpoints that already took this event: the job
  // covers every subscription, so one failing endpoint would otherwise make the
  // healthy ones receive it up to five times.
  const alreadyDelivered = new Set(
    (
      await db.webhookDelivery.findMany({
        where: { eventId: event.eventId, status: 'success' },
        select: { subscriptionId: true },
      })
    ).map((row) => row.subscriptionId),
  );

  const envelope: WebhookEnvelope = {
    id: event.eventId,
    topic: event.topic,
    shopId: event.shopId,
    shopSlug: shop.slug,
    occurredAt: event.occurredAt,
    data: event.data,
  };

  const maxAttempts = ctx.maxAttempts || WEBHOOK_MAX_ATTEMPTS;
  const failed: string[] = [];

  for (const subscription of subscriptions) {
    if (alreadyDelivered.has(subscription.id)) continue;

    const attempt = await postWebhook({
      url: subscription.url,
      secret: subscription.secret,
      envelope,
    });
    const state = nextDeliveryState(attempt, ctx.attempt, maxAttempts);

    await db.webhookDelivery.upsert({
      where: {
        subscriptionId_eventId: { subscriptionId: subscription.id, eventId: event.eventId },
      },
      create: {
        id: newId('webhookDelivery'),
        // Redundant at runtime — the tenant client stamps it — but Prisma's
        // generated create input still requires it. See docs/AGENT-LOG.md.
        shopId: event.shopId,
        subscriptionId: subscription.id,
        eventId: event.eventId,
        topic: event.topic,
        // The exact envelope, so the admin app can show — and replay — what was sent.
        payload: envelope,
        ...state,
      },
      update: state,
    });

    if (attempt.ok) {
      logger.info('webhook delivered', {
        topic: event.topic,
        subscriptionId: subscription.id,
        status: attempt.status,
      });
    } else {
      logger.warn('webhook delivery failed', {
        topic: event.topic,
        subscriptionId: subscription.id,
        attempt: ctx.attempt,
        of: maxAttempts,
        status: attempt.status,
      });
      failed.push(subscription.id);
    }
  }

  // Throwing is how the queue is told to back off and try again.
  if (failed.length > 0) {
    throw new Error(
      `webhook ${event.topic}: ${failed.length}/${subscriptions.length} subscription(s) failed`,
    );
  }
}

export const webhookDeliverJob: JobDefinition = {
  name: JOB_NAMES.webhookDeliver,
  queue: QUEUES.webhooks,
  handler,
};
