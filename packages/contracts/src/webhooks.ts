/** Webhook subscriptions + delivery log (SPEC §13). Owner: WS-G. */

import { WEBHOOK_TOPICS } from '@merchant/config/constants';
import { z } from 'zod';
import { idSchema, paginated, paginationQuery, timestampsSchema } from './common.ts';

export const webhookTopicSchema = z.enum(WEBHOOK_TOPICS);

export const webhookSubscriptionSchema = z
  .object({
    id: idSchema,
    appId: idSchema,
    topic: webhookTopicSchema,
    url: z.string().url(),
    /** Returned once at creation; the merchant HMACs bodies with it. */
    secretSuffix: z.string().length(4),
    isActive: z.boolean().default(true),
  })
  .merge(timestampsSchema);
export type WebhookSubscription = z.infer<typeof webhookSubscriptionSchema>;

export const createWebhookInput = z.object({
  topic: webhookTopicSchema,
  url: z.string().url(),
});

export const createWebhookResponse = z.object({
  subscription: webhookSubscriptionSchema,
  secret: z.string(),
});

export const webhookDeliveryStatusSchema = z.enum(['pending', 'success', 'failed', 'exhausted']);

export const webhookDeliverySchema = z
  .object({
    id: idSchema,
    subscriptionId: idSchema,
    topic: webhookTopicSchema,
    status: webhookDeliveryStatusSchema,
    attempts: z.number().int().nonnegative(),
    responseStatus: z.number().int().nullable().default(null),
    lastError: z.string().max(2000).nullable().default(null),
    deliveredAt: z.string().datetime({ offset: true }).nullable().default(null),
    payload: z.record(z.unknown()),
  })
  .merge(timestampsSchema);

export const listDeliveriesQuery = paginationQuery.extend({
  topic: webhookTopicSchema.optional(),
  status: webhookDeliveryStatusSchema.optional(),
});

export const deliveryListResponse = paginated(webhookDeliverySchema);

/**
 * Envelope every delivery POSTs. Signature is HMAC-SHA256 of the RAW body with
 * the subscription secret, in `x-merchant-hmac-sha256` — verify against the raw
 * bytes, not a re-serialized object, or whitespace will break it.
 */
export const webhookEnvelopeSchema = z.object({
  id: idSchema,
  topic: webhookTopicSchema,
  shopId: idSchema,
  shopSlug: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  data: z.record(z.unknown()),
});
export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;
