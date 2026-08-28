import { expect, test } from '@playwright/test';
import {
  ADMIN_URL,
  API_URL,
  addSocksToCartAndOpenCheckout,
  fillCheckoutAddressAndPickStandard,
  loginAsOwner,
  payWithApprovedCard,
  STOREFRONT_URL,
  searchAdminIndex,
  storefrontUrlFor,
  uniqueSuffix,
} from './helpers.ts';

/**
 * SPEC §14.4 — the five mandatory flows. Owner: WS-H.
 *
 * These are the whole e2e budget. Do not add a sixth without cutting one.
 *
 * The exact money strings come from the seed: Basin Wool Socks (M) is $18.00,
 * Standard shipping is $8.95, tax is a flat 8.5% on the discounted subtotal.
 * No discount: 1800 + 895 + round(1800 × 8.5%) = 2848 → $28.48.
 * WELCOME10:   1800 − 180 + 895 + round(1620 × 8.5%) = 2653 → $26.53.
 */

test.describe('mandatory smoke flows', () => {
  test('a) staff login → create product with 2 variants → appears in list', async ({ page }) => {
    const title = `Smoke Tee ${uniqueSuffix()}`;

    await test.step('log in and open the product form', async () => {
      await loginAsOwner(page);
      await page.getByRole('link', { name: 'Products', exact: true }).click();
      await page.waitForURL(/\/products$/);
      await page.getByRole('link', { name: 'Add product' }).click();
      await page.waitForURL(/\/products\/new$/);
    });

    await test.step('fill title, price and two options', async () => {
      await page.locator('input[name="title"]').fill(title);
      await page.locator('textarea[name="description"]').fill('Created by the e2e smoke suite.');
      // Price first, while there is a single variant row — generated variants
      // inherit the first row's price.
      await page.getByLabel('Price').fill('24.00');

      await page.getByRole('button', { name: 'Add options like size or color' }).click();
      await page.getByLabel('Option name').fill('Size');
      const sizeValues = page.getByLabel('Option values');
      for (const value of ['S', 'M']) {
        await sizeValues.fill(value);
        await sizeValues.press('Enter');
      }

      await page.getByRole('button', { name: /Add another option/ }).click();
      await page.getByLabel('Option name').nth(1).fill('Color');
      const colorValues = page.getByLabel('Option values').nth(1);
      for (const value of ['Black', 'White']) {
        await colorValues.fill(value);
        await colorValues.press('Enter');
      }

      await expect(page.getByText('4 variants')).toBeVisible();
    });

    await test.step('save and land on the product page', async () => {
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Product saved')).toBeVisible();
      await page.waitForURL(/\/products\/prod_/);
    });

    await test.step('product appears in the index', async () => {
      await page.goto(`${ADMIN_URL}/store/demo/products`);
      await searchAdminIndex(page, title);
      await expect(page.getByText(title)).toBeVisible();
    });
  });

  test('b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund', async ({
    page,
  }) => {
    const email = `smoke-b-${uniqueSuffix()}@example.dev`;
    const expectedTotal = '$28.48';
    let orderNumber = '';

    await test.step('buy the socks on the storefront', async () => {
      await addSocksToCartAndOpenCheckout(page);
      await fillCheckoutAddressAndPickStandard(page, email);
      // The literal figure the admin order must later repeat.
      await expect(page.getByText(expectedTotal)).toBeVisible();
      await payWithApprovedCard(page);
    });

    await test.step('thank-you page shows the order number', async () => {
      const confirmation = page.getByText(/Confirmation #\d+/);
      await expect(confirmation).toBeVisible();
      orderNumber = (await confirmation.innerText()).match(/#(\d+)/)?.[1] ?? '';
      expect(Number(orderNumber)).toBeGreaterThan(1040); // the seed owns #1001–#1040
      await expect(page.getByText(expectedTotal)).toBeVisible();
    });

    await test.step('order exists in the admin with the same total', async () => {
      await loginAsOwner(page);
      await page.goto(`${ADMIN_URL}/store/demo/orders`);
      await searchAdminIndex(page, `#${orderNumber}`);
      await page.getByText(`#${orderNumber}`).click();
      await page.waitForURL(/\/orders\/ord_/);
      await expect(page.getByText(expectedTotal).first()).toBeVisible();
    });

    await test.step('refund it in full', async () => {
      await page.getByRole('link', { name: 'Refund' }).click();
      await page.waitForURL(/\/refund$/);
      await page.getByLabel('Quantity').fill('1');
      await page.getByLabel('Shipping amount').fill('8.95');
      // The refund total is priced by a debounced calculate call; the button
      // label carries the amount once it lands — and it must be the full total.
      const refundButton = page.getByRole('button', { name: `Refund ${expectedTotal}` });
      await expect(refundButton).toBeEnabled();
      await refundButton.click();
      await expect(page.getByText('Refund issued')).toBeVisible();
      await page.waitForURL(/\/orders\/ord_[^/]+$/);
      await expect(page.getByText('Refunded', { exact: true }).first()).toBeVisible();
    });
  });

  test('c) discount code applies at checkout', async ({ page }) => {
    await addSocksToCartAndOpenCheckout(page);

    await test.step('apply WELCOME10', async () => {
      await page.getByLabel('Discount code').fill('WELCOME10');
      await page.getByRole('button', { name: 'Apply' }).click();
      await expect(page.getByText('WELCOME10 applied')).toBeVisible();
      // − is U+2212 (the sidebar's minus sign), not an ASCII hyphen.
      await expect(page.getByText('−$1.80')).toBeVisible();
    });

    await test.step('reduced total once shipping is known', async () => {
      await fillCheckoutAddressAndPickStandard(page, `smoke-c-${uniqueSuffix()}@example.dev`);
      // Scoped to the totals list — the line item repeats the $18.00 price.
      await expect(page.locator('dl').getByText('$18.00')).toBeVisible(); // subtotal, undiscounted
      await expect(page.getByText('$26.53')).toBeVisible(); // 18.00 − 1.80 + 8.95 + 1.38 tax
    });
  });

  test('d) AI builder: apply preset → publish → storefront reflects it', async ({ page }) => {
    // The storefront caches the published theme for up to 60s, so the final
    // assertion polls past that window.
    test.setTimeout(180_000);

    await test.step('apply the Monochrome preset', async () => {
      await loginAsOwner(page);
      await page.getByRole('link', { name: 'Storefront', exact: true }).click();
      await page.waitForURL(/\/storefront$/);
      // Preset rows render in THEME_PRESETS order: Aurora, Monochrome, Bloom.
      await page.getByRole('button', { name: 'Apply' }).nth(1).click();
      await expect(page.getByText('Monochrome applied')).toBeVisible();
    });

    await test.step('publish it', async () => {
      const publish = page.getByRole('button', { name: 'Publish', exact: true }).first();
      await expect(publish).toBeEnabled();
      await publish.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Publish this theme?')).toBeVisible();
      await dialog.getByRole('button', { name: 'Publish', exact: true }).click();
      // .first(): the modal leaves a visually-hidden copy of the toast text behind.
      await expect(page.getByText('Theme published').first()).toBeVisible();
      await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
    });

    await test.step('storefront home reflects the preset', async () => {
      await expect(async () => {
        await page.goto(STOREFRONT_URL, { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Complimentary shipping and returns, everywhere.')).toBeVisible(
          { timeout: 2_000 },
        );
      }).toPass({ timeout: 90_000, intervals: [3_000] });
      // The tokens change too, not just the copy.
      await expect(page.locator('body')).toHaveAttribute(
        'style',
        /--theme-color-primary:\s*#111111/,
      );
    });
  });

  test('e) second shop signup is isolated from the demo shop', async ({ page }) => {
    const suffix = uniqueSuffix();
    const shopName = `Smoke Isolation ${suffix}`;
    let slug = '';

    await test.step('sign up a fresh shop through the UI', async () => {
      await page.goto(`${ADMIN_URL}/signup`);
      await page.locator('input[name="shopName"]').fill(shopName);
      await page.locator('input[name="firstName"]').fill('Iso');
      await page.locator('input[name="email"]').fill(`iso-${suffix}@example.dev`);
      await page.locator('input[name="password"]').fill('password123');
      await page.getByRole('button', { name: 'Create store' }).click();
      // The slug is derived (and de-duplicated) server-side — read it back.
      await page.waitForURL(/\/store\/[^/]+$/);
      slug = new URL(page.url()).pathname.split('/')[2] ?? '';
      expect(slug).not.toBe('');
      expect(slug).not.toBe('demo');
    });

    await test.step('its admin shows empty states', async () => {
      await page.goto(`${ADMIN_URL}/store/${slug}/products`);
      await expect(page.getByRole('heading', { name: 'Add your first product' })).toBeVisible();
    });

    await test.step('its storefront renders with none of demo’s products', async () => {
      await page.goto(storefrontUrlFor(slug));
      await expect(page.getByText(shopName).first()).toBeVisible();
      await expect(page.getByText('Basin Wool Socks')).toHaveCount(0);
      await expect(page.getByText('Alpine Merino Crewneck')).toHaveCount(0);
    });

    await test.step('demo storefront is unaffected', async () => {
      await page.goto(STOREFRONT_URL);
      await expect(page.getByText('Aurora Supply Co.').first()).toBeVisible();
      await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
    });
  });
});

test('skeleton: api answers /health', async ({ request }) => {
  const response = await request.get(`${API_URL}/health`);
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).status).toBe('ok');
});
