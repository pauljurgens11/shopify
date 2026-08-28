/**
 * Seed (SPEC §7). Harness owned by WS-A; the demo content is WS-H's.
 *
 * **The seed IS the demo.** It must end up looking like a real store, not test
 * fixtures: "Aurora Supply Co.", ~30 apparel products with real-looking images,
 * 40 orders spread over 60 days so analytics has a shape to it.
 *
 * What exists today is the minimum that makes the stack resolvable: one shop and
 * its owner. Everything below the marker is WS-H's to build out.
 *
 * Idempotent by construction — `pnpm seed` twice in a row is a normal thing to do.
 */

import { newId } from '@merchant/config/ids';
import { hash } from '@node-rs/argon2';
import { dbAdmin } from '../../src/client.ts';

const DEMO_SHOP_SLUG = 'demo';
const DEMO_OWNER_EMAIL = 'owner@demo.dev';
const DEMO_OWNER_PASSWORD = 'password123';

async function main() {
  console.log('seeding…');

  // dbAdmin is correct here: seed is one of the four sanctioned unscoped call
  // sites (SPEC §6). Every tenant row below sets shopId explicitly.
  const shop = await dbAdmin.shop.upsert({
    where: { slug: DEMO_SHOP_SLUG },
    update: {},
    create: {
      id: newId('shop'),
      slug: DEMO_SHOP_SLUG,
      name: 'Aurora Supply Co.',
      email: DEMO_OWNER_EMAIL,
      currencyCode: 'USD',
      timezone: 'America/New_York',
      plan: 'trial',
    },
  });

  // Per-shop order numbers start at #1001, like Shopify (SPEC §5).
  await dbAdmin.orderSequence.upsert({
    where: { shopId: shop.id },
    update: {},
    create: { shopId: shop.id },
  });

  // argon2id — the same hasher the login route uses (SPEC §8).
  const passwordHash = await hash(DEMO_OWNER_PASSWORD);

  await dbAdmin.staffUser.upsert({
    where: { shopId_email: { shopId: shop.id, email: DEMO_OWNER_EMAIL } },
    update: {},
    create: {
      id: newId('user'),
      shopId: shop.id,
      email: DEMO_OWNER_EMAIL,
      passwordHash,
      firstName: 'Aurora',
      lastName: 'Owner',
      role: 'owner',
      permissions: {},
    },
  });

  console.log(`  shop  ${shop.slug} (${shop.id})`);
  console.log(`  staff ${DEMO_OWNER_EMAIL} / ${DEMO_OWNER_PASSWORD}`);

  // ---------------------------------------------------------------------------
  // TODO(WS-H): the actual demo — 2 locations, ~30 products with images,
  // 4 collections, 25 customers, 40 orders over 60 days, 3 discounts,
  // mock processor connected, one published AI theme.
  // ---------------------------------------------------------------------------

  console.log('seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => dbAdmin.$disconnect());
