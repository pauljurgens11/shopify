/**
 * Worker entrypoint (SPEC §13). Owner: WS-G.
 *
 * One BullMQ Worker per queue; jobs self-register through jobs/index.ts.
 */

import { QUEUES } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
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

  return new Worker(
    queue,
    async (job) => {
      const definition = jobsForQueue.get(job.name);
      if (!definition) throw new Error(`No handler registered for job "${job.name}"`);
      await definition.handler(job.data);
    },
    { connection, concurrency: 5 },
  );
});

console.log(`worker: listening on ${Object.values(QUEUES).join(', ')} (${JOBS.length} jobs)`);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void Promise.all(workers.map((w) => w.close())).then(() => process.exit(0));
  });
}
