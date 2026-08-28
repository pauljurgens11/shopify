import { defineConfig } from 'vitest/config';

/**
 * Admin tests cover the pure modules under `src/lib` only — nav visibility and
 * the API error envelope. SPEC §14 forbids component and snapshot tests, so
 * there is no jsdom environment here on purpose: the shell is verified by
 * running it (see the A3 issue's test plan).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
