/**
 * Catalog webhook emission (SPEC §13).
 *
 * A thin typed wrapper over G1's producer, kept only so a catalog route cannot
 * accidentally emit a non-`products/*` topic. B1's runtime-import indirection —
 * which existed to no-op while G1 was unmerged — is gone.
 *
 * Fire and forget: `emitWebhookEvent` never throws (it returns whether the job
 * queued), because a webhook must never be the reason a product failed to save.
 */
import type { WebhookTopic } from '@merchant/config/constants';
import { emitWebhookEvent } from '@merchant/config/queue';

export async function emitCatalogEvent(
  shopId: string,
  topic: Extract<WebhookTopic, `products/${string}`>,
  data: Record<string, unknown>,
): Promise<void> {
  await emitWebhookEvent(shopId, topic, data);
}
