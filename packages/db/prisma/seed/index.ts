/**
 * Seed (SPEC §7). Owner: WS-H (WS-A owns the harness).
 *
 * **The seed IS the demo.** It must look like a real store, not test fixtures:
 * "Aurora Supply Co.", ~30 apparel products with real-looking images, 40 orders
 * spread over 60 days so the analytics dashboard has a shape to it.
 *
 * Must be idempotent — `pnpm seed` twice in a row is a normal thing to do.
 */
import { dbAdmin } from '../../src/client.ts';

async function main() {
  console.log('seeding…');

  // TODO(WS-H): demo shop `demo` (owner@demo.dev / password123), 2 locations,
  // ~30 products, 4 collections, 25 customers, 40 orders over 60 days,
  // 3 discounts, mock processor connected, one published theme.
  //
  // Use dbAdmin here — seed is one of the four sanctioned unscoped call sites
  // (SPEC §6). Set shopId explicitly on every row.

  console.log('seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => dbAdmin.$disconnect());
