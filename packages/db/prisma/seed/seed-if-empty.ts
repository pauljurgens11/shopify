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

// "Exists" is not "finished": seedDemo creates the Shop row first and is not
// transactional, so a crash mid-seed leaves a half-built demo that a
// shop-existence check would then protect forever. The rollups are written
// last, which makes them the completion marker — a shop without them is a
// partial seed and gets rebuilt (seedDemo wipes the demo shop first).
const complete =
  existing !== null &&
  (await dbAdmin.analyticsRollupDaily.count({ where: { shopId: existing.id }, take: 1 })) > 0;

if (existing && complete) {
  console.log(`Demo shop "${DEMO_SHOP_SLUG}" already exists (${existing.id}) — not reseeding.`);
} else {
  if (existing) {
    console.log(`Demo shop "${DEMO_SHOP_SLUG}" exists but looks half-seeded — rebuilding it.`);
  }
  const summary = await seedDemo();
  console.log(
    `Seeded ${DEMO_SHOP_SLUG}: ${summary.products} products, ${summary.orders} orders (${summary.shopId}).`,
  );
}

await dbAdmin.$disconnect();
