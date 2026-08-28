/**
 * Queue job payloads (SPEC §13). Owner: WS-G.
 *
 * Every producer serializes one of these; every worker handler parses its
 * payload with the matching schema before touching it. A job that sat in Redis
 * across a deploy is untrusted input like any other, so the boundary is real.
 *
 * Payloads carry IDs, not snapshots — the handler re-reads through
 * `dbForShop(shopId)`, so a retry can never email last week's totals.
 */
import { z } from 'zod';
import { idSchema, timestampSchema } from './common.ts';
import { webhookTopicSchema } from './webhooks.ts';

export const webhookEventJobSchema = z.object({
  /** `evt_…`. Doubles as the BullMQ job id, so a double-emit is one delivery. */
  eventId: idSchema,
  shopId: idSchema,
  topic: webhookTopicSchema,
  occurredAt: timestampSchema,
  /**
   * When set, the event is delivered ONLY to this subscription — "send test
   * event" uses it so a test does not fan out to every same-topic subscription
   * (other apps included). Optional so events queued before this field existed
   * still parse; absent means normal topic fan-out.
   */
  subscriptionId: idSchema.optional(),
  /** Topic-shaped resource body; becomes `data` in the delivered envelope. */
  data: z.record(z.unknown()),
});
export type WebhookEventJob = z.infer<typeof webhookEventJobSchema>;

export const orderConfirmationEmailJobSchema = z.object({
  shopId: idSchema,
  orderId: idSchema,
  /**
   * Link to the thank-you page. Supplied by the enqueuer (E3 holds the checkout
   * token); when null the email simply omits the button, which beats shipping a
   * guessed URL that 404s in front of a customer.
   */
  orderStatusUrl: z.string().url().nullable().default(null),
});
export type OrderConfirmationEmailJob = z.infer<typeof orderConfirmationEmailJobSchema>;
