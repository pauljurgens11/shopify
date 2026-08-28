/**
 * Job registry (SPEC §13). Owner: WS-G (AI jobs: WS-F).
 *
 * Add a job by creating `jobs/<name>.ts` and adding ONE line here. Kept as a
 * flat list rather than a switch statement so the diff is a single line and
 * conflicts stay trivial to resolve (CLAUDE.md §3).
 *
 * Every job must be IDEMPOTENT: BullMQ retries, and a retried order-confirmation
 * email that sends twice is a real customer-visible bug.
 */
import { aiThemeGenerate } from './ai-theme-generate.ts';
import { analyticsRollupJob } from './analytics-rollup.ts';
import { orderConfirmationEmailJob } from './order-confirmation-email.ts';
import type { JobDefinition } from './types.ts';
import { webhookDeliverJob } from './webhook-deliver.ts';

// biome-ignore lint/suspicious/noExplicitAny: the registry is heterogeneous by design
export const JOBS: JobDefinition<any>[] = [
  webhookDeliverJob,
  orderConfirmationEmailJob,
  aiThemeGenerate,
  analyticsRollupJob,
];

export type { JobContext, JobDefinition } from './types.ts';
