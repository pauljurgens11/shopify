/**
 * `/admin/api/apps` — private apps, their Admin API tokens and their webhook
 * subscriptions (SPEC §8, §13). Owner: WS-G.
 *
 * Thin by design: the rules live in `services/apps/apps.ts`. What this file is
 * careful about is the pair of responses that carry a plaintext credential —
 * create/rotate (token) and webhook create (signing secret). Those are the only
 * places the value exists after generation, which is why they are separate
 * contracts from the ordinary read shapes.
 */
import { emitWebhookEvent } from '@merchant/config/queue';
import {
  appDeliveryListResponse,
  appListResponse,
  appSchema,
  appWebhookListResponse,
  createAppInput,
  createAppResponse,
  createAppWebhookInput,
  createAppWebhookResponse,
  listAppsQuery,
  rotateAppTokenResponse,
  sendTestEventResponse,
  updateAppInput,
} from '@merchant/contracts/apps';
import { deletedResponse, idParam, paginationQuery } from '@merchant/contracts/common';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createApp,
  createAppWebhook,
  deleteAppWebhook,
  getApp,
  listAppDeliveries,
  listApps,
  listAppWebhooks,
  rotateToken,
  uninstallApp,
  updateApp,
} from '../../../services/apps/apps.ts';

const webhookParams = idParam.extend({ webhookId: z.string() });

export default async function routes(app: FastifyInstance) {
  const apps = { preHandler: requirePermission('apps') };

  app.get('/', apps, async (request) => {
    const query = listAppsQuery.parse(request.query ?? {});
    return appListResponse.parse(await listApps(request.db, query.limit, query.cursor));
  });

  app.post('/', apps, async (request, reply) => {
    const input = createAppInput.parse(request.body ?? {});
    const created = await createApp(request.db, request.shopId as string, input);
    // The one response carrying the plaintext token.
    return reply.status(201).send(createAppResponse.parse(created));
  });

  app.get('/:id', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    return appSchema.parse(await getApp(request.db, id));
  });

  app.put('/:id', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    const input = updateAppInput.parse(request.body ?? {});
    return appSchema.parse(await updateApp(request.db, id, input));
  });

  app.post('/:id/rotate-token', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    return rotateAppTokenResponse.parse(await rotateToken(request.db, id));
  });

  app.delete('/:id', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    await uninstallApp(request.db, id);

    // SPEC §13 lists `app/uninstalled`. It reaches OTHER apps subscribed to the
    // topic, not this one: the worker filters deliveries to installed apps, so
    // the app being removed is exactly the one that will not hear about it.
    await emitWebhookEvent(request.shopId as string, 'app/uninstalled', { id });

    return deletedResponse.parse({ id, deleted: true });
  });

  /* --- webhook subscriptions ------------------------------------------------ */

  app.get('/:id/webhooks', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    return appWebhookListResponse.parse({ data: await listAppWebhooks(request.db, id) });
  });

  app.post('/:id/webhooks', apps, async (request, reply) => {
    const { id } = idParam.parse(request.params);
    const input = createAppWebhookInput.parse(request.body ?? {});
    const created = await createAppWebhook(request.db, request.shopId as string, id, input);
    // The one response carrying the plaintext signing secret.
    return reply.status(201).send(createAppWebhookResponse.parse(created));
  });

  app.delete('/:id/webhooks/:webhookId', apps, async (request) => {
    const { id, webhookId } = webhookParams.parse(request.params);
    await deleteAppWebhook(request.db, id, webhookId);
    return deletedResponse.parse({ id: webhookId, deleted: true });
  });

  /**
   * Fire a real event through G1's producer so the merchant can prove the
   * endpoint works — same queue, same signing, same delivery row as a live
   * `orders/create`. A simulated success would prove nothing.
   */
  app.post('/:id/webhooks/:webhookId/test', apps, async (request) => {
    const { id, webhookId } = webhookParams.parse(request.params);
    const subscriptions = await listAppWebhooks(request.db, id);
    const subscription = subscriptions.find((row) => row.id === webhookId);
    if (!subscription) throw notFound('Webhook subscription');

    // Targeted at this one subscription: a test must not POST at every other
    // endpoint (or other app) that happens to share the topic.
    const eventId = await emitWebhookEvent(
      request.shopId as string,
      subscription.topic,
      { id: webhookId, test: true, message: 'Test event from Merchant.' },
      { subscriptionId: webhookId },
    );

    // The real event id, so the UI can point at the delivery row this produced.
    return sendTestEventResponse.parse({ eventId, queued: eventId !== null });
  });

  app.get('/:id/deliveries', apps, async (request) => {
    const { id } = idParam.parse(request.params);
    const query = paginationQuery.parse(request.query ?? {});
    return appDeliveryListResponse.parse(
      await listAppDeliveries(request.db, id, query.limit, query.cursor),
    );
  });
}
