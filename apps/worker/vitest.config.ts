import { defineConfig } from 'vitest/config';

/**
 * The rollup tests run against the real Postgres from `docker compose` — a
 * rollup that agrees with a mocked query proves nothing about the aggregate
 * SQL it actually issues. The rest of the worker's tests are pure and do not
 * care either way.
 *
 * One fork, in file order: parallel forks writing shop rows to the same
 * database produce failures that look like bugs and are not (same reasoning as
 * apps/api/vitest.config.ts).
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
