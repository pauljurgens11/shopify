/**
 * Seed (SPEC §7) — **the seed IS the demo**.
 *
 * It builds Aurora Supply Co., a small-run Portland apparel label: ~30 products
 * with real photography, two locations with stock history, 25 customers, 40
 * orders across 60 days, three discounts, a connected processor, a published
 * theme and sixty days of analytics. Everything a reviewer clicks in the admin
 * is data written here, so it has to look like a store rather than a fixture
 * (CLAUDE.md §8).
 *
 * Two properties it must keep:
 *
 *   **Deterministic** — one fixed RNG seed (`random.ts`), no `Math.random()`,
 *   no unseeded dates. Eight agents run `pnpm db:reset` all day; a store that
 *   reshuffles itself makes every screenshot and bug report irreproducible.
 *
 *   **Idempotent** — running it twice is normal. It wipes the demo shop's rows
 *   and rebuilds them, which is the only way the SPEC §7 counts stay exact.
 *
 * `dbAdmin` (unscoped) is sanctioned here — seed is one of the four call sites
 * (SPEC §6). Every row still sets `shopId` explicitly.
 */

import { pathToFileURL } from 'node:url';
import { dbAdmin } from '../../src/client.ts';
import { createAnalytics } from './analytics.ts';
import { createCatalog } from './catalog.ts';
import { createCollections } from './collections.ts';
import type { SeedContext } from './context.ts';
import { createCustomers } from './customers.ts';
import { createDiscounts } from './discounts.ts';
import { applyStockCorrections, InventoryLedger } from './inventory.ts';
import { createOrders, endOfHistory } from './orders.ts';
import { createSavedCards } from './pay.ts';
import { createRng } from './random.ts';
import {
  applyShopSettings,
  createLocations,
  createProcessor,
  createShop,
  createStaff,
  createTheme,
  DEMO_OWNER_EMAIL,
  DEMO_PASSWORD,
  DEMO_SHOP_SLUG,
  resetDemoData,
  TAX_RATE_PERCENTAGE,
} from './shop.ts';

export { DEMO_OWNER_EMAIL, DEMO_PASSWORD, DEMO_SHOP_SLUG } from './shop.ts';

export interface SeedSummary {
  shopId: string;
  products: number;
  variants: number;
  customers: number;
  orders: number;
}

export async function seedDemo(): Promise<SeedSummary> {
  const shop = await createShop(dbAdmin);
  await resetDemoData(dbAdmin, shop.id);

  const ctx: SeedContext = {
    shopId: shop.id,
    // Captured once: every relative timestamp in this run is derived from it, so
    // orders, adjustments, events and rollups all agree on what "today" means.
    now: new Date(),
    rng: createRng(),
    currencyCode: 'USD',
    taxRatePercentage: TAX_RATE_PERCENTAGE,
  };

  await applyShopSettings(dbAdmin, ctx);
  await createStaff(dbAdmin, ctx);

  const locations = await createLocations(dbAdmin, ctx);
  const ledger = new InventoryLedger(ctx.shopId);

  const products = await createCatalog(dbAdmin, ctx, locations, ledger);
  await createCollections(dbAdmin, ctx, products);

  const customers = await createCustomers(dbAdmin, ctx);
  const discounts = await createDiscounts(dbAdmin, ctx);

  await createProcessor(dbAdmin, ctx);
  await createTheme(dbAdmin, ctx);

  const orders = await createOrders(dbAdmin, ctx, {
    products,
    customers,
    locations,
    discounts,
    ledger,
  });

  // After orders: the saved cards go to customers who demonstrably buy, so the
  // order pages a reviewer opens actually show D4's "charge saved card" block.
  await createSavedCards(dbAdmin, ctx, { customers, orders });

  // A handful of genuinely sold-out variants: two everywhere (storefront
  // sold-out badge) and four more only in the store (the per-location split B6
  // renders). Deliberate, because 40 orders never exhaust a warehouse.
  const sellableVariants = products
    .filter((p) => p.status === 'active')
    .flatMap((p) => p.variants.map((v) => v.id));
  const soldOut = ctx.rng.sample(sellableVariants, 2);
  const storeOnly = ctx.rng.sample(
    sellableVariants.filter((id) => !soldOut.includes(id)),
    4,
  );
  // Stamped at the end of history, not the run instant: a correction dated
  // "today at 07:35:09" changes with every reseed and breaks the seed's
  // per-UTC-date determinism (DECISIONS.md — history ends at end of yesterday).
  const correctedAt = endOfHistory(ctx);
  applyStockCorrections(
    ledger,
    soldOut,
    [locations.retail.id, locations.warehouse.id],
    correctedAt,
  );
  applyStockCorrections(ledger, storeOnly, [locations.retail.id], correctedAt);

  // Last: the ledger has now collected opening stock, sales, restocks and
  // corrections, and writes the levels their sum implies (inventory.ts).
  await ledger.flush(dbAdmin);

  await createAnalytics(dbAdmin, ctx, { products, orders });

  return {
    shopId: shop.id,
    products: products.length,
    variants: products.reduce((acc, p) => acc + p.variants.length, 0),
    customers: customers.length,
    orders: orders.length,
  };
}

/**
 * Only run when invoked as a script — `seed.test.ts` imports `seedDemo` directly
 * and must not trigger a second run on import. The canonical ESM entrypoint
 * check, rather than a substring match on the path: a checkout living under a
 * directory with "seed" in its name would defeat that.
 */
const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  seedDemo()
    .then((summary) => {
      console.log(`  shop      ${DEMO_SHOP_SLUG} (${summary.shopId})`);
      console.log(`  staff     ${DEMO_OWNER_EMAIL} / ${DEMO_PASSWORD}`);
      console.log(
        `  catalog   ${summary.products} products · ${summary.variants} variants · ${summary.customers} customers · ${summary.orders} orders`,
      );
      console.log('seed complete');
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => dbAdmin.$disconnect());
}
