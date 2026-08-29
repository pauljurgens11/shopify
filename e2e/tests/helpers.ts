/**
 * Shared plumbing for the smoke flows (SPEC §14.4). Owner: WS-H.
 *
 * Not a test file — the five flows + health check in smoke.spec.ts are the
 * whole e2e budget.
 */
import { type APIResponse, expect, type Page } from '@playwright/test';

export const ADMIN_URL = process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000';
export const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://demo.lvh.me:3002';
export const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/**
 * The API origin the ADMIN app authenticates against. Cleanup calls must hit
 * this exact origin — the session cookie is host-scoped, so a request to the
 * probe URL above (`localhost`) would go out unauthenticated.
 */
export const ADMIN_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://api.lvh.me:3001';

/**
 * Cookie-authenticated admin API call from a logged-in page's context.
 * `page.request` shares the browser's cookie jar; the `x-requested-with`
 * header is the API's CSRF presence check for session-proved mutations.
 *
 * Exists so flows can clean up after themselves: seed data IS the demo
 * (CLAUDE.md §8), and a smoke run must not leave products or stock movements
 * behind in the seeded store.
 */
export async function adminApi(
  page: Page,
  method: 'get' | 'post' | 'delete',
  path: string,
  body?: unknown,
): Promise<APIResponse> {
  return page.request[method](`${ADMIN_API_URL}${path}`, {
    headers: { 'x-requested-with': 'e2e-smoke' },
    ...(body === undefined ? {} : { data: body }),
  });
}

/** Per-flow unique data so a retry never collides with an earlier run's rows. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** `demo.lvh.me:3002` + `fresh-shop` → `http://fresh-shop.lvh.me:3002`. */
export function storefrontUrlFor(slug: string): string {
  const base = new URL(STOREFRONT_URL);
  const domain = base.hostname.split('.').slice(1).join('.');
  const port = base.port ? `:${base.port}` : '';
  return `${base.protocol}//${slug}.${domain}${port}`;
}

/**
 * Sign up a brand-new shop through the UI and land on its admin home, logged
 * in as its owner. Flows that mutate shop-wide state (the published theme) run
 * on a shop of their own so a local `pnpm e2e` never restyles the seeded demo
 * store (§8: seed data IS the demo). Returns the server-derived slug.
 */
export async function signupFreshShop(
  page: Page,
  shopName: string,
  email: string,
): Promise<string> {
  await page.goto(`${ADMIN_URL}/signup`);
  await page.locator('input[name="shopName"]').fill(shopName);
  await page.locator('input[name="firstName"]').fill('Smoke');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Create store' }).click();
  // The slug is derived (and de-duplicated) server-side — read it back.
  await page.waitForURL(/\/store\/[^/]+$/);
  const slug = new URL(page.url()).pathname.split('/')[2] ?? '';
  expect(slug).not.toBe('');
  return slug;
}

/** The `name` attributes are pinned by A3 for exactly this helper. */
export async function loginAsOwner(page: Page): Promise<void> {
  await page.goto(`${ADMIN_URL}/login`);
  await page.locator('input[name="email"]').fill('owner@demo.dev');
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/store\/demo/);
}

/**
 * Storefront: seeded product page → add to cart → cart → the checkout page.
 * Basin Wool Socks (M) is the flow-friendly seeded product: one size option,
 * $18.00, well under the $150 free-shipping threshold so Standard ($8.95)
 * always applies.
 */
export async function addSocksToCartAndOpenCheckout(page: Page): Promise<void> {
  await page.goto(`${STOREFRONT_URL}/products/basin-wool-socks`);
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('Added to your cart.')).toBeVisible();
  await page.getByRole('link', { name: 'View cart' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();
  await page.getByRole('link', { name: 'Check out' }).click();
  // /checkout creates the checkout server-side and 302s to its token URL.
  await page.waitForURL(/\/checkouts\/[^/]+$/);
}

/**
 * Contact + Delivery. The address only saves on blur once every required field
 * is set, and the shipping rates render only after that save — so this ends by
 * picking Standard shipping, which is also the wait for the rates to appear.
 */
export async function fillCheckoutAddressAndPickStandard(page: Page, email: string): Promise<void> {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('First name').fill('Smoke');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address', { exact: true }).fill('100 Test Street');
  await page.getByLabel('City').fill('Portland');
  await page.getByLabel('State').fill('OR');
  await page.getByLabel('ZIP code').fill('97201');
  await page.getByLabel('ZIP code').blur();
  // “Standard shipping (3–5 days)” — matched loosely because of the en dash.
  await page.getByText(/Standard shipping/).click();
}

/** The mock processor approves 4242…; the PAN goes straight to the vault. */
export async function payWithApprovedCard(page: Page): Promise<void> {
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiration date').pressSequentially('1229');
  await page.getByLabel('Security code').fill('123');
  await page.getByLabel('Name on card').fill('Smoke Shopper');
  const payNow = page.getByRole('button', { name: 'Pay now' });
  await expect(payNow).toBeEnabled();
  await payNow.click();
  await page.waitForURL(/\/thank-you$/, { timeout: 30_000 });
}

/**
 * Polaris IndexFilters only renders its query input in filtering mode, so
 * searching an admin index is always activate-then-type.
 */
export async function searchAdminIndex(page: Page, query: string): Promise<void> {
  await page.getByRole('button', { name: 'Search and filter results' }).click();
  await page.getByPlaceholder('Searching in all').fill(query);
}
