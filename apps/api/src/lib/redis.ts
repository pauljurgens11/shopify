/**
 * The API's Redis connection (sessions today; nothing else yet).
 *
 * Constructed on first use rather than at import time, so importing a helper
 * from this module does not open a socket in a process that has no business
 * talking to Redis — the same laziness `packages/config/env.ts` uses.
 *
 * Owner: WS-A.
 */
import { env } from '@merchant/config/env';
import Redis from 'ioredis';

let client: Redis | undefined;

export function redis(): Redis {
  if (!client) {
    client = new Redis(env().REDIS_URL, {
      // A session read that hangs is worse than one that fails: the admin
      // shows an error instead of a spinner that never resolves.
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return client;
}

/** Tests and graceful shutdown. Safe to call when nothing ever connected. */
export async function closeRedis(): Promise<void> {
  if (!client) return;
  const current = client;
  client = undefined;
  await current.quit().catch(() => current.disconnect());
}
