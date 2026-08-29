/**
 * Customer webhook emission (SPEC §13). Owner: WS-G.
 *
 * A thin typed wrapper over G1's producer, kept so a customer code path cannot
 * accidentally emit a non-`customers/*` topic — same pattern as
 * `services/catalog/events.ts`. Emitted from the C4 service seams
 * (`createCustomer`, and `findOrCreateByEmail` when it actually created) so
 * admin, checkout and storefront registration all fire it without three call
 * sites in three route trees (DECISIONS.md).
 *
 * Fire and forget: `emitWebhookEvent` never throws — a webhook must never be
 * the reason a customer failed to save.
 */
import type { WebhookTopic } from '@merchant/config/constants';
import { emitWebhookEvent } from '@merchant/config/queue';

export async function emitCustomerEvent(
  shopId: string,
  topic: Extract<WebhookTopic, `customers/${string}`>,
  data: Record<string, unknown>,
): Promise<void> {
  await emitWebhookEvent(shopId, topic, data);
}
