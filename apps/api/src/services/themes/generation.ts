/**
 * Handing an AI theme request to the worker (SPEC §12, §13). Owner: WS-F.
 *
 * A thin delegation to WS-G's shared producer (`@merchant/config/queue`).
 * Queue name, job name and payload type are the same compile-time constants
 * the worker registers with (`jobs/ai-theme-generate.ts`), so a rename on
 * either side is a type error — not a job the worker silently has no handler
 * for while the merchant watches a thinking-bubble that never resolves.
 */
import { QUEUES } from '@merchant/config/constants';
import { enqueue, JOB_NAMES } from '@merchant/config/queue';
import type { AiThemeJobPayload } from '@merchant/contracts/theme';

/**
 * Returns the queued job id. Throws if the queue is unreachable — the caller
 * turns that into a failed chat message, because a pending bubble that never
 * resolves is worse than an apology.
 */
export async function enqueueThemeGeneration(payload: AiThemeJobPayload): Promise<string> {
  // Derived from the message: a retried request resolves the same bubble once.
  const jobId = `${JOB_NAMES.aiThemeGeneration}-${payload.messageId}`;
  await enqueue(QUEUES.ai, JOB_NAMES.aiThemeGeneration, payload, {
    jobId,
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
  });
  return jobId;
}
