/**
 * The queue producer (SPEC §13). Owner: WS-G.
 *
 * Lives in `config` rather than `worker` because both API processes and the
 * worker itself need to enqueue, and neither may import the other.
 *
 * Payload SHAPES are defined in `@merchant/contracts/jobs`; this file cannot
 * import them (contracts already depends on config, and a cycle between two
 * source-only packages resolves differently in vite and in tsx). The worker
 * parses every payload with the contract schema on the way out, and
 * `apps/worker/src/lib/webhook-delivery.test.ts` asserts what is built here
 * still satisfies that schema — so the two stay pinned together by a test
 * rather than by a type.
 */
import type { JobsOptions, Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUES, type QueueName, WEBHOOK_MAX_ATTEMPTS, type WebhookTopic } from './constants.ts';
import { env } from './env.ts';
import { newId } from './ids.ts';

/** One name per handler file in `apps/worker/src/jobs/`. */
export const JOB_NAMES = {
  webhookDeliver: 'webhook-deliver',
  orderConfirmationEmail: 'order-confirmation-email',
  analyticsRollup: 'analytics-rollup',
  aiThemeGeneration: 'ai-theme-generation',
} as const;
export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

/**
 * Kept long enough that a deterministic job id still de-duplicates: BullMQ only
 * rejects a repeated id while the job record exists, so trimming aggressively
 * would quietly turn idempotency back into at-least-once.
 */
const RETENTION: Pick<JobsOptions, 'removeOnComplete' | 'removeOnFail'> = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 1000 },
};

/**
 * bullmq and ioredis are imported lazily, and the promises are memoized rather
 * than the values, so concurrent callers share one connection.
 *
 * Lazy on purpose, twice over: importing this module for `buildWebhookEventJob`
 * must not open a Redis socket, and bullmq publishes no `exports` map — its
 * `module` entry is a bundler-only ESM build with directory imports, which Vite
 * (and therefore vitest) picks and Node then cannot load. A dynamic import stays
 * on Node's own resolution, where the CJS entry works.
 */
let connection: Promise<Redis> | undefined;
const queues = new Map<QueueName, Promise<Queue>>();

function producerConnection(): Promise<Redis> {
  connection ??= (async () => {
    const { Redis } = await import('ioredis');
    const client = new Redis(env().REDIS_URL, {
      // BullMQ manages its own retry semantics and requires this to be null.
      maxRetriesPerRequest: null,
      // A producer inside a request handler must fail fast, not hang the request.
      enableOfflineQueue: false,
    });
    // Without a listener, ioredis emits an unhandled 'error' and kills the process.
    client.on('error', (err: Error) => {
      console.warn(`queue: redis connection error — ${err.message}`);
    });
    return client;
  })();
  return connection;
}

export function getQueue(name: QueueName): Promise<Queue> {
  let queue = queues.get(name);
  if (!queue) {
    queue = (async () => {
      const { Queue } = await import('bullmq');
      const created = new Queue(name, { connection: await producerConnection() });
      created.on('error', (err: Error) => {
        console.warn(`queue(${name}): ${err.message}`);
      });
      return created;
    })();
    queues.set(name, queue);
  }
  return queue;
}

export async function enqueue(
  queue: QueueName,
  jobName: JobName,
  payload: unknown,
  opts: JobsOptions = {},
): Promise<void> {
  const target = await getQueue(queue);
  await target.add(jobName, payload, { ...RETENTION, ...opts });
}

/** Exported for the contract-conformance test; `emitWebhookEvent` is the real caller. */
export function buildWebhookEventJob(
  shopId: string,
  topic: WebhookTopic,
  data: Record<string, unknown>,
  now: Date = new Date(),
) {
  return {
    eventId: newId('event'),
    shopId,
    topic,
    occurredAt: now.toISOString(),
    data,
  };
}

/**
 * Fire a webhook topic. Resolving which subscriptions want it is the worker's
 * job — the caller only says what happened.
 *
 * Deliberately never throws: an order must not fail to save because Redis
 * blinked (DECISIONS.md). Returns whether the job was actually queued, so a
 * caller that cares can say so.
 */
export async function emitWebhookEvent(
  shopId: string,
  topic: WebhookTopic,
  data: Record<string, unknown>,
): Promise<boolean> {
  const job = buildWebhookEventJob(shopId, topic, data);
  try {
    await enqueue(QUEUES.webhooks, JOB_NAMES.webhookDeliver, job, {
      jobId: job.eventId,
      attempts: WEBHOOK_MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2_000 },
    });
    return true;
  } catch (err) {
    console.warn(
      `queue: dropped ${topic} for ${shopId} — ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

/**
 * Job id is derived from the order, so re-enqueueing (a retried checkout
 * completion, a double-click) sends one email rather than two.
 *
 * The separator is a hyphen: BullMQ rejects a custom job id containing `:`,
 * which it reserves for its own Redis key namespace.
 */
export async function enqueueOrderConfirmationEmail(
  shopId: string,
  orderId: string,
  orderStatusUrl: string | null = null,
): Promise<boolean> {
  try {
    await enqueue(
      QUEUES.email,
      JOB_NAMES.orderConfirmationEmail,
      { shopId, orderId, orderStatusUrl },
      {
        jobId: `${JOB_NAMES.orderConfirmationEmail}-${orderId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    );
    return true;
  } catch (err) {
    console.warn(
      `queue: dropped order email for ${orderId} — ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

/** Let a script or a test exit instead of hanging on an open Redis socket. */
export async function closeQueues(): Promise<void> {
  const open = [...queues.values()];
  queues.clear();
  await Promise.all(open.map(async (q) => (await q).close()));
  if (connection) {
    const client = await connection;
    connection = undefined;
    client.disconnect();
  }
}
