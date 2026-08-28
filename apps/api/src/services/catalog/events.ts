/**
 * Catalog webhook emission (SPEC §13).
 *
 * The real producer is G1's `emitWebhookEvent` in `@merchant/config/queue`,
 * which is not on `main` yet. Rather than block B1 or ship a throwing stub
 * (CLAUDE.md §8), this resolves the module at runtime and degrades to a no-op
 * until it lands — the moment G1 merges, these routes start emitting with no
 * edit here. The specifier is assembled at runtime so `tsc` does not try to
 * resolve a file that does not exist yet.
 *
 * DELETE THIS INDIRECTION once G1 is on main and import `emitWebhookEvent`
 * directly.
 */
import type { WebhookTopic } from '@merchant/config/constants';

type Emitter = (
  shopId: string,
  topic: WebhookTopic,
  data: Record<string, unknown>,
) => Promise<boolean>;

const NOOP: Emitter = async () => false;

let resolved: Promise<Emitter> | undefined;

function emitter(): Promise<Emitter> {
  resolved ??= (async () => {
    try {
      const specifier = ['@merchant', 'config', 'queue'].join('/');
      const mod = (await import(/* @vite-ignore */ specifier)) as {
        emitWebhookEvent?: Emitter;
      };
      return mod.emitWebhookEvent ?? NOOP;
    } catch {
      return NOOP;
    }
  })();
  return resolved;
}

/**
 * Fire and forget. A webhook must never be the reason a product failed to save,
 * so failures are swallowed the same way G1's producer swallows a dead Redis.
 */
export async function emitCatalogEvent(
  shopId: string,
  topic: Extract<WebhookTopic, `products/${string}`>,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await (await emitter())(shopId, topic, data);
  } catch {
    /* already logged by the producer; never surfaced to the caller */
  }
}
