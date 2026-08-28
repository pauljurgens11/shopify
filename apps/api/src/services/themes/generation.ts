/**
 * Handing an AI theme request to the worker (SPEC §12, §13). Owner: WS-F.
 *
 * TEMPORARY SHAPE: WS-G's shared producer (`@merchant/config/queue`, PR #11)
 * is not on `main` yet. The queue name and job name here are exactly WS-G's
 * (`QUEUES.ai` / `JOB_NAMES.aiThemeGeneration`), so once that lands the body of
 * `enqueueThemeGeneration` collapses to a single `enqueue(...)` delegation and
 * this connection goes away. See docs/AGENT-LOG.md.
 */
import { QUEUES } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import type { AiThemeJobPayload } from '@merchant/contracts/theme';
import type { Queue } from 'bullmq';

/** Must equal WS-G's `JOB_NAMES.aiThemeGeneration`. */
const JOB_NAME = 'ai-theme-generation';

/**
 * Lazy and memoized: importing this module must not open a Redis socket, and
 * bullmq publishes no `exports` map — a static import resolves to its
 * bundler-only ESM build, which Node cannot load.
 */
let queue: Promise<Queue> | undefined;

function aiQueue(): Promise<Queue> {
  queue ??= (async () => {
    const { Queue } = await import('bullmq');
    const created = new Queue(QUEUES.ai, {
      connection: {
        url: env().REDIS_URL,
        // BullMQ manages its own retries; a producer inside a request handler
        // must fail fast rather than hang the request.
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      },
    });
    created.on('error', (error: Error) => {
      console.warn(`queue(ai): ${error.message}`);
    });
    return created;
  })();
  return queue;
}

/**
 * Returns the queued job id. Throws if the queue is unreachable — the caller
 * turns that into a failed chat message, because a pending bubble that never
 * resolves is worse than an apology.
 */
export async function enqueueThemeGeneration(payload: AiThemeJobPayload): Promise<string> {
  const target = await aiQueue();
  // Derived from the message: a retried request resolves the same bubble once.
  const jobId = `${JOB_NAME}-${payload.messageId}`;
  await target.add(JOB_NAME, payload, {
    jobId,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });
  return jobId;
}

/** Let tests and scripts exit instead of hanging on an open Redis socket. */
export async function closeThemeQueue(): Promise<void> {
  if (!queue) return;
  const open = await queue;
  queue = undefined;
  await open.close();
}
