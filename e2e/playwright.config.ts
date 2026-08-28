import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke suite only (SPEC §14.4). Runs against a seeded, already-running stack —
 * it does not start the apps, because the flows cross three of them.
 *
 * Forbidden here: anything that is not one of the five flows in SPEC §14.4.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 45_000,
  use: {
    baseURL: process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
