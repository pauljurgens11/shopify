import type { QueueName } from '@merchant/config/constants';

/**
 * What the queue knows about this run. Handlers need it to tell "will retry"
 * from "this was the last try" — a webhook row says `exhausted` and the mailer
 * falls back to the console only on the final attempt.
 */
export type JobContext = {
  /** 1-based. BullMQ's `attemptsMade` is 0 on the first run. */
  attempt: number;
  maxAttempts: number;
  jobId: string;
};

export type JobDefinition<T = unknown> = {
  /** Must be unique across all jobs; also the filename. */
  name: string;
  queue: QueueName;
  handler: (payload: T, ctx: JobContext) => Promise<void>;
};
