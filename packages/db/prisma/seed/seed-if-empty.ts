/**
 * Seed, but only into an empty database (A5, SPEC §17).
 *
 * The production compose runs this on every `up`. `seedDemo()` itself is
 * idempotent, but idempotent means "wipes the demo shop and rebuilds it" —
 * exactly right for `pnpm db:reset`, exactly wrong for a stack restart, which
 * must not undo whatever the merchant did between boots. So: seed when the
 * demo shop is absent, touch nothing when it exists.
 */
import { dbAdmin } from '../../src/client.ts';
import { DEMO_SHOP_SLUG, seedDemo } from './index.ts';

const existing = await dbAdmin.shop.findUnique({
  where: { slug: DEMO_SHOP_SLUG },
  select: { id: true },
});

if (existing) {
  console.log(`Demo shop "${DEMO_SHOP_SLUG}" already exists (${existing.id}) — not reseeding.`);
} else {
  const summary = await seedDemo();
  console.log(
    `Seeded ${DEMO_SHOP_SLUG}: ${summary.products} products, ${summary.orders} orders (${summary.shopId}).`,
  );
}

await dbAdmin.$disconnect();
