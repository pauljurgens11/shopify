import type { QueueName } from '@merchant/config/constants';

export type JobDefinition<T = unknown> = {
  /** Must be unique across all jobs; also the filename. */
  name: string;
  queue: QueueName;
  handler: (payload: T) => Promise<void>;
};
