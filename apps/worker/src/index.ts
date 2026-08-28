/**
 * Worker entrypoint (SPEC §13). Owner: WS-G.
 *
 * One BullMQ Worker per queue; jobs self-register through jobs/index.ts.
 */

import { QUEUES } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import { enqueue, JOB_NAMES } from '@merchant/config/queue';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { JOBS } from './jobs/index.ts';

const config = env();

const connection = new IORedis(config.REDIS_URL, {
  // Required by BullMQ: it manages its own retry semantics.
  maxRetriesPerRequest: null,
});

const workers = Object.values(QUEUES).map((queue) => {
  const jobsForQueue = new Map(JOBS.filter((j) => j.queue === queue).map((j) => [j.name, j]));

  const worker = new Worker(
    queue,
    async (job) => {
      const definition = jobsForQueue.get(job.name);
      if (!definition) throw new Error(`No handler registered for job "${job.name}"`);
      await definition.handler(job.data, {
        // attemptsMade is 0 on the first run; handlers count from 1.
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
        jobId: job.id ?? job.name,
      });
    },
    { connection, concurrency: 5 },
  );

  // Without this the only trace of a failing job is BullMQ's silent retry.
  worker.on('failed', (job, err) => {
    const attempt = job ? `${job.attemptsMade}/${job.opts.attempts ?? 1}` : '?';
    console.log(
      `[warn] worker: ${job?.name ?? queue} failed (attempt ${attempt}) — ${err.message}`,
    );
  });

  return worker;
});

/**
 * Scheduled work (SPEC §13). BullMQ keys a repeatable by name + repeat options,
 * so re-adding it on every boot is idempotent rather than a duplicate.
 *
 * Registered here rather than in the job file so every schedule in the system is
 * visible in one place.
 */
await enqueue(
  QUEUES.analytics,
  JOB_NAMES.analyticsRollup,
  {},
  { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: { count: 20 } },
).catch((err: unknown) => {
  // A worker that cannot schedule still processes what is queued; say so loudly
  // rather than exiting and taking webhook delivery down with it.
  console.log(
    `[error] worker: could not schedule the analytics rollup — ${err instanceof Error ? err.message : String(err)}`,
  );
});

console.log(`worker: listening on ${Object.values(QUEUES).join(', ')} (${JOBS.length} jobs)`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void Promise.all(workers.map((w) => w.close())).then(() => process.exit(0));
  });
}
