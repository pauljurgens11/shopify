import { defineConfig } from 'vitest/config';

/**
 * API tests run against the real Postgres and Redis from `docker compose`
 * (SPEC §14.1 — the tenancy suite is only meaningful against a real database).
 *
 * They share one database, so they run in a single fork, in file order: two
 * forks racing on the same shop rows produce failures that look like tenancy
 * bugs and are not.
 */
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
        // `@fastify/autoload` discovers routes with a plain dynamic import, so
        // route files never pass through Vite's transform — Node loads the .ts
        // directly. tsx is what does that in dev and in production (see
        // DECISIONS.md), so tests load the route tree the same way instead of
        // through Node's strip-only mode, which rejects parameter properties.
        execArgv: ['--import', 'tsx'],
      },
    },
    // argon2id is deliberately slow, and signup hashes a password.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
