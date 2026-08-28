import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke suite only (SPEC §14.4).
 *
 * The flows cross three apps, so Playwright starts all of them. `reuseExistingServer`
 * means a local run attaches to whatever `pnpm dev` already has up instead of
 * fighting it for ports; CI always starts its own.
 */
const ADMIN_URL = process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://demo.lvh.me:3002';

/**
 * Readiness for the two Next.js apps is a localhost port probe, not a URL
 * fetch — `*.lvh.me` needs external DNS, which is exactly the kind of thing
 * that flakes on CI runners. The API keeps a URL probe because /health proves
 * the DB connection, and its URL is localhost already.
 */
const port = (url: string) => Number(new URL(url).port || 80);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: ADMIN_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Same DNS story in the browser: every `*.lvh.me` host resolves locally.
    // (The storefront's own SSR fetches still resolve `{slug}.lvh.me` through
    // the runner's DNS — this rule only takes Playwright out of the equation.)
    launchOptions: { args: ['--host-resolver-rules=MAP *.lvh.me 127.0.0.1'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @merchant/api start',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @merchant/admin start',
      port: port(ADMIN_URL),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '..',
    },
    {
      command: 'pnpm --filter @merchant/storefront start',
      port: port(STOREFRONT_URL),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '..',
    },
  ],
});
