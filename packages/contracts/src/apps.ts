/** Private apps + Admin API tokens (SPEC §8, §13). Owner: WS-G. */

import { PERMISSION_AREAS, WEBHOOK_TOPICS } from '@merchant/config/constants';
import { z } from 'zod';
import { idSchema, paginated, paginationQuery, timestampsSchema } from './common.ts';

/** Scopes mirror the staff permission areas, read/write split like Shopify's. */
export const appScopeSchema = z.enum(
  PERMISSION_AREAS.flatMap((area) => [`read_${area}`, `write_${area}`]) as [string, ...string[]],
);

export const appSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    scopes: z.array(appScopeSchema).default([]),
    /** Only the last 4 chars — the token itself is shown exactly once, at creation. */
    tokenSuffix: z.string().length(4),
    lastUsedAt: z.string().datetime({ offset: true }).nullable().default(null),
  })
  .merge(timestampsSchema);
export type App = z.infer<typeof appSchema>;

export const createAppInput = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(appScopeSchema).min(1),
});

/** The ONLY response that ever contains the plaintext token. */
export const createAppResponse = z.object({
  app: appSchema,
  apiToken: z.string().startsWith('shpat_'),
});

export const listAppsQuery = paginationQuery;
export const appListResponse = paginated(appSchema);

export const updateAppInput = z.object({
  name: z.string().min(1).max(255).optional(),
  scopes: z.array(appScopeSchema).min(1).optional(),
});

/** Rotate returns a new plaintext token and kills the old one immediately. */
export const rotateAppTokenResponse = createAppResponse;

/* --- webhook subscriptions, per app ---------------------------------------- */

export const createAppWebhookInput = z.object({
  topic: z.enum(WEBHOOK_TOPICS),
  url: z.string().url(),
});

/** The ONLY response that ever contains the plaintext signing secret. */
export const createAppWebhookResponse = z.object({
  subscription: z.object({
    id: idSchema,
    appId: idSchema,
    topic: z.enum(WEBHOOK_TOPICS),
    url: z.string().url(),
    secretSuffix: z.string().length(4),
    isActive: z.boolean(),
    createdAt: z.string().datetime({ offset: true }),
  }),
  secret: z.string(),
});

export const appWebhookSchema = createAppWebhookResponse.shape.subscription;
export type AppWebhook = z.infer<typeof appWebhookSchema>;

export const appWebhookListResponse = z.object({ data: z.array(appWebhookSchema) });

/** One delivery attempt, newest first, for the app detail page's log. */
export const appDeliverySchema = z.object({
  id: idSchema,
  subscriptionId: idSchema,
  eventId: idSchema,
  topic: z.enum(WEBHOOK_TOPICS),
  status: z.enum(['pending', 'success', 'failed', 'exhausted']),
  attempts: z.number().int().nonnegative(),
  responseStatus: z.number().int().nullable(),
  lastError: z.string().nullable(),
  deliveredAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export const appDeliveryListResponse = paginated(appDeliverySchema);
export type AppDelivery = z.infer<typeof appDeliverySchema>;

/**
 * `POST /admin/api/apps/:id/webhooks/:webhookId/test` — fires a real delivery.
 * `eventId` is null when the queue could not accept it: emitting a webhook is
 * best-effort by design and never throws (DECISIONS.md), so the UI has to be
 * able to say "not queued" rather than show a spinner forever.
 */
export const sendTestEventResponse = z.object({
  eventId: idSchema.nullable(),
  queued: z.boolean(),
});
