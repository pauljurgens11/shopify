/**
 * The three demo discounts (H1, SPEC §7).
 *
 * `WELCOME10` is load-bearing: H2's smoke flow (c) applies exactly that code at
 * checkout, and C1's engine reads these rows verbatim.
 */
import { newId } from '@merchant/config/ids';
import type { PrismaClient } from '@prisma/client';
import { daysAgo, type SeedContext } from './context.ts';
import { FREE_SHIPPING_THRESHOLD } from './shop.ts';

export interface SeededDiscount {
  id: string;
  code: string | null;
  type: string;
  valueType: string;
  value: number;
}

export const WELCOME_CODE = 'WELCOME10';

export async function createDiscounts(
  db: PrismaClient,
  ctx: SeedContext,
): Promise<{ welcome: SeededDiscount; freeShipping: SeededDiscount; expired: SeededDiscount }> {
  const welcome: SeededDiscount = {
    id: newId('discount'),
    code: WELCOME_CODE,
    type: 'amount_off_order',
    valueType: 'percentage',
    value: 10,
  };
  const freeShipping: SeededDiscount = {
    id: newId('discount'),
    code: null,
    type: 'free_shipping',
    valueType: 'percentage',
    value: 100,
  };
  const expired: SeededDiscount = {
    id: newId('discount'),
    code: 'SUMMER20',
    type: 'amount_off_order',
    valueType: 'percentage',
    value: 20,
  };

  await db.discount.createMany({
    data: [
      {
        id: welcome.id,
        shopId: ctx.shopId,
        title: '10% off your first order',
        code: welcome.code,
        type: welcome.type,
        valueType: welcome.valueType,
        value: welcome.value,
        appliesTo: { scope: 'all' },
        minimumRequirement: { type: 'none' },
        usageLimit: null,
        oncePerCustomer: true,
        usedCount: 0, // reconciled against redemptions once orders exist
        startsAt: daysAgo(ctx, 90, 0),
        endsAt: null,
        status: 'active',
        createdAt: daysAgo(ctx, 90, 0),
      },
      {
        // Automatic (code === null): the discounts index shows an "Automatic"
        // badge for these, and checkout applies them with nothing typed.
        id: freeShipping.id,
        shopId: ctx.shopId,
        title: 'Free shipping over $150',
        code: null,
        type: freeShipping.type,
        valueType: freeShipping.valueType,
        value: freeShipping.value,
        appliesTo: { scope: 'all' },
        minimumRequirement: {
          type: 'subtotal',
          value: { amount: FREE_SHIPPING_THRESHOLD, currencyCode: ctx.currencyCode },
        },
        usageLimit: null,
        oncePerCustomer: false,
        usedCount: 0,
        startsAt: daysAgo(ctx, 120, 0),
        endsAt: null,
        status: 'active',
        createdAt: daysAgo(ctx, 120, 0),
      },
      {
        // Expired, so the Expired status badge and the status filter tab on the
        // discounts index have a row to show (C6).
        id: expired.id,
        shopId: ctx.shopId,
        title: 'Summer sale — 20% off',
        code: expired.code,
        type: expired.type,
        valueType: expired.valueType,
        value: expired.value,
        appliesTo: { scope: 'all' },
        minimumRequirement: { type: 'none' },
        usageLimit: 500,
        oncePerCustomer: false,
        usedCount: 0,
        startsAt: daysAgo(ctx, 150, 0),
        endsAt: daysAgo(ctx, 95, 0),
        status: 'expired',
        createdAt: daysAgo(ctx, 150, 0),
      },
    ],
  });

  return { welcome, freeShipping, expired };
}
