/**
 * The shop itself, its staff, locations, payment processor and published theme (H1).
 *
 * `dbAdmin` (unscoped) is one of the four sanctioned call sites (SPEC §6); every
 * row below still sets `shopId` explicitly.
 */
import { newId } from '@merchant/config/ids';
import { DEFAULT_PRESET, presetThemeDoc } from '@merchant/theme-engine/presets';
import { hash } from '@node-rs/argon2';
import type { PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';

/**
 * SPEC §5 fixes the ID prefix set. A few seeded rows — DiscountRedemption,
 * AnalyticsRollupDaily, BuilderConversation, shipping rates — still have no
 * prefix of their own and are never shown in a URL; they use the generic `evt_`.
 */
export const DEMO_SHOP_SLUG = 'demo';
export const DEMO_OWNER_EMAIL = 'owner@demo.dev';
export const DEMO_STAFF_EMAIL = 'maya@aurorasupply.dev';
export const DEMO_PASSWORD = 'password123';

/** Flat rate on Shop.taxSettings; every seeded order's tax is computed from it. */
export const TAX_RATE_PERCENTAGE = 8.5;

export const SHIPPING_STANDARD = { name: 'Standard shipping (3–5 days)', price: 895 };
export const SHIPPING_EXPRESS = { name: 'Express shipping (2 days)', price: 1895 };
/** Matches the automatic free-shipping discount seeded in discounts.ts. */
export const FREE_SHIPPING_THRESHOLD = 15000;

/**
 * Everything the demo owns, in an order that respects the foreign keys Prisma
 * does not cascade (Payment → ProcessorConfig, Order → Customer).
 *
 * Wipe-then-rebuild rather than upsert-everything: it is the only way to
 * guarantee the exact SPEC §7 counts after a second run, and `pnpm db:reset`
 * plus `pnpm seed` are both routine here.
 */
export async function resetDemoData(db: PrismaClient, shopId: string): Promise<void> {
  const where = { where: { shopId } };

  await db.analyticsEvent.deleteMany(where);
  await db.analyticsRollupDaily.deleteMany(where);

  await db.discountRedemption.deleteMany(where);
  await db.discount.deleteMany(where);

  await db.paymentRefund.deleteMany(where);
  await db.payment.deleteMany(where);
  await db.paymentMethod.deleteMany(where);
  await db.vaultCard.deleteMany(where);
  await db.routingRule.deleteMany(where);
  await db.processorConfig.deleteMany(where);

  await db.orderEvent.deleteMany(where);
  await db.refund.deleteMany(where);
  await db.fulfillment.deleteMany(where);
  await db.orderLineItem.deleteMany(where);
  await db.order.deleteMany(where);

  await db.customerAddress.deleteMany(where);
  await db.customer.deleteMany(where);

  await db.collectionProduct.deleteMany(where);
  await db.collection.deleteMany(where);

  await db.inventoryAdjustment.deleteMany(where);
  await db.inventoryLevel.deleteMany(where);
  await db.location.deleteMany(where);

  await db.productImage.deleteMany(where);
  await db.productOption.deleteMany(where);
  await db.productVariant.deleteMany(where);
  await db.product.deleteMany(where);

  await db.themeVersion.deleteMany(where);
  await db.builderConversation.deleteMany(where);

  await db.staffUser.deleteMany(where);
  await db.orderSequence.deleteMany({ where: { shopId } });
}

export async function createShop(db: PrismaClient): Promise<{ id: string }> {
  return db.shop.upsert({
    where: { slug: DEMO_SHOP_SLUG },
    update: {},
    create: {
      id: newId('shop'),
      slug: DEMO_SHOP_SLUG,
      name: 'Aurora Supply Co.',
      email: DEMO_OWNER_EMAIL,
      currencyCode: 'USD',
      timezone: 'America/Los_Angeles',
      plan: 'grow',
    },
    select: { id: true },
  });
}

/** Settings the admin's Settings pages (A4) read, and checkout (E3) prices from. */
export async function applyShopSettings(db: PrismaClient, ctx: SeedContext): Promise<void> {
  await db.shop.update({
    where: { id: ctx.shopId },
    data: {
      // A store this far along has finished onboarding — an untouched checklist
      // on a store with 40 orders reads as broken (SPEC §8).
      onboarding: {
        addProduct: true,
        customizeStorefront: true,
        addPaymentProcessor: true,
        placeTestOrder: true,
        dismissed: false,
      },
      taxSettings: { ratePercentage: TAX_RATE_PERCENTAGE, pricesIncludeTax: false },
      checkoutSettings: {
        requireCustomerAccount: false,
        showTipping: false,
        orderNotePrompt: 'Add a note for the packing team',
      },
      shippingRates: [
        {
          id: newId('event'),
          name: SHIPPING_STANDARD.name,
          price: { amount: SHIPPING_STANDARD.price, currencyCode: ctx.currencyCode },
          minOrderSubtotal: null,
          maxOrderSubtotal: null,
        },
        {
          id: newId('event'),
          name: SHIPPING_EXPRESS.name,
          price: { amount: SHIPPING_EXPRESS.price, currencyCode: ctx.currencyCode },
          minOrderSubtotal: null,
          maxOrderSubtotal: null,
        },
        {
          id: newId('event'),
          name: 'Free shipping',
          price: { amount: 0, currencyCode: ctx.currencyCode },
          minOrderSubtotal: { amount: FREE_SHIPPING_THRESHOLD, currencyCode: ctx.currencyCode },
          maxOrderSubtotal: null,
        },
      ],
    },
  });
}

export async function createStaff(db: PrismaClient, ctx: SeedContext): Promise<void> {
  // One hash, reused: argon2id is deliberately slow, and hashing twice here adds
  // a second to a script eight agents run all day.
  const passwordHash = await hash(DEMO_PASSWORD);

  await db.staffUser.createMany({
    data: [
      {
        id: newId('user'),
        shopId: ctx.shopId,
        email: DEMO_OWNER_EMAIL,
        passwordHash,
        firstName: 'Aurora',
        lastName: 'Owner',
        role: 'owner',
        permissions: {},
        lastLoginAt: daysAgo(ctx, 1, 9, 12),
        createdAt: daysAgo(ctx, 400),
      },
      {
        // Partial permissions: without a second, restricted user the staff and
        // permissions screens (A4) have nothing to demonstrate.
        id: newId('user'),
        shopId: ctx.shopId,
        email: DEMO_STAFF_EMAIL,
        passwordHash,
        firstName: 'Maya',
        lastName: 'Okonjo',
        role: 'staff',
        permissions: {
          orders: true,
          products: true,
          customers: true,
          discounts: false,
          settings: false,
          analytics: false,
        },
        lastLoginAt: daysAgo(ctx, 1, 16, 40),
        createdAt: daysAgo(ctx, 120),
      },
    ],
  });
}

export interface SeededLocation {
  id: string;
  name: string;
}

export async function createLocations(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<{ retail: SeededLocation; warehouse: SeededLocation }> {
  const retail: SeededLocation = { id: newId('location'), name: 'Downtown Store' };
  const warehouse: SeededLocation = { id: newId('location'), name: 'Warehouse' };

  await db.location.createMany({
    data: [
      {
        id: retail.id,
        shopId: ctx.shopId,
        name: retail.name,
        address: {
          address1: '812 SW Alder St',
          city: 'Portland',
          province: 'Oregon',
          provinceCode: 'OR',
          country: 'United States',
          countryCode: 'US',
          zip: '97205',
          phone: '+1 503 555 0100',
        },
        isActive: true,
        fulfillsOnlineOrders: true,
        createdAt: daysAgo(ctx, 400),
      },
      {
        id: warehouse.id,
        shopId: ctx.shopId,
        name: warehouse.name,
        address: {
          address1: '4501 NE Columbia Blvd',
          city: 'Portland',
          province: 'Oregon',
          provinceCode: 'OR',
          country: 'United States',
          countryCode: 'US',
          zip: '97218',
          phone: '+1 503 555 0101',
        },
        isActive: true,
        fulfillsOnlineOrders: true,
        createdAt: daysAgo(ctx, 400),
      },
    ],
  });

  return { retail, warehouse };
}

/**
 * The mock processor, connected and routing 100% of traffic (SPEC §11).
 *
 * `encryptedCredentials` stays null on purpose: the mock adapter takes no
 * credentials, and `packages/db` cannot import `packages/pay` to seal a dummy
 * pair without creating a package cycle (pay already depends on db). See
 * DECISIONS.md.
 */
export async function createProcessor(db: PrismaClient, ctx: SeedContext): Promise<void> {
  const configId = newId('processor');

  await db.processorConfig.create({
    data: {
      id: configId,
      shopId: ctx.shopId,
      processor: 'mock',
      displayName: 'Mock Gateway (test)',
      enabled: true,
      testMode: true,
      lastVerifiedAt: daysAgo(ctx, 61),
      createdAt: daysAgo(ctx, 90),
    },
  });

  await db.routingRule.create({
    data: {
      id: newId('routingRule'),
      shopId: ctx.shopId,
      processorConfigId: configId,
      position: 0,
      weight: 100,
      conditions: {},
      createdAt: daysAgo(ctx, 90),
    },
  });
}

/**
 * The aurora preset, published (F1 owns the preset; H1 owns publishing it).
 * A draft version and a short chat history come with it so the AI builder (F4)
 * opens onto a real conversation rather than an empty pane.
 */
export async function createTheme(db: PrismaClient, ctx: SeedContext): Promise<void> {
  const published = presetThemeDoc(DEFAULT_PRESET);
  const draft = presetThemeDoc('monochrome');
  const conversationId = newId('event');
  const publishedId = newId('theme');
  const draftId = newId('theme');

  await db.builderConversation.create({
    data: {
      id: conversationId,
      shopId: ctx.shopId,
      messages: [
        {
          id: 'msg_1',
          role: 'user',
          content:
            'We sell small-run merino and waxed canvas apparel out of Portland. Make the storefront feel warm and unhurried — serif headings, lots of room.',
          themeVersionId: null,
          status: 'complete',
          createdAt: daysAgo(ctx, 58, 10, 4).toISOString(),
        },
        {
          id: 'msg_2',
          role: 'assistant',
          content:
            'Built "Aurora": a warm sand background, clay accents, Fraunces headings over Work Sans body copy, and a full-bleed hero above the featured edit.',
          themeVersionId: publishedId,
          status: 'complete',
          createdAt: daysAgo(ctx, 58, 10, 5).toISOString(),
        },
        {
          id: 'msg_3',
          role: 'user',
          content: 'Show me what a stricter, black-and-white version would look like.',
          themeVersionId: null,
          status: 'complete',
          createdAt: daysAgo(ctx, 12, 15, 20).toISOString(),
        },
        {
          id: 'msg_4',
          role: 'assistant',
          content:
            'Here is "Monochrome" as a draft — same structure, no colour, tighter type. Publish it if you prefer it.',
          themeVersionId: draftId,
          status: 'complete',
          createdAt: daysAgo(ctx, 12, 15, 21).toISOString(),
        },
      ],
      createdAt: daysAgo(ctx, 58, 10, 4),
    },
  });

  await db.themeVersion.createMany({
    data: [
      {
        id: publishedId,
        shopId: ctx.shopId,
        themeJson: published,
        tokens: published.tokens,
        status: 'published',
        publishedAt: daysAgo(ctx, 58, 10, 6),
        createdByMessage: 'Warm and unhurried, serif headings, lots of room',
        conversationId,
        createdAt: daysAgo(ctx, 58, 10, 5),
      },
      {
        id: draftId,
        shopId: ctx.shopId,
        themeJson: draft,
        tokens: draft.tokens,
        status: 'draft',
        publishedAt: null,
        createdByMessage: 'A stricter, black-and-white version',
        conversationId,
        createdAt: daysAgo(ctx, 12, 15, 21),
      },
    ],
  });
}
