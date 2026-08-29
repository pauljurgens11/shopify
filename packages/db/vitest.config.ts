import { defineConfig } from 'vitest/config';

/**
 * Loads the root `.env` before any test file (see ./vitest.setup.ts), so the
 * CLAUDE.md single-file recipe (`pnpm --filter @merchant/db exec vitest run …`)
 * works exactly like the package's `test` script — without it, vitest starts
 * with no DATABASE_URL and every seed test dies before its first assertion.
 * CI job env still wins: the setup never overrides an already-set variable.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['prisma/**/*.test.ts', 'src/**/*.test.ts'],
    // Both suites talk to the same database (seed.test.ts reseeds it);
    // parallel files would race each other into false failures.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
