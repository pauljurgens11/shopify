/**
 * Minimal levelled logger. The worker has no request context, so pino's
 * machinery buys nothing here — but a level filter does, because delivery
 * attempts are noisy and a demo terminal is small.
 *
 * Never pass a subscription secret or a full webhook payload to this (SPEC §15,
 * issue G1 landmines) — identifiers and statuses only.
 */
import { env } from '@merchant/config/env';

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const;
type Level = keyof typeof LEVELS;

let threshold: number | undefined;

function enabled(level: Level): boolean {
  threshold ??= LEVELS[env().LOG_LEVEL];
  return LEVELS[level] >= threshold;
}

function emit(level: Level, message: string, fields?: Record<string, unknown>): void {
  if (!enabled(level)) return;
  const suffix = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : '';
  console.log(`[${level}] worker: ${message}${suffix}`);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => emit('debug', message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit('error', message, fields),
};
