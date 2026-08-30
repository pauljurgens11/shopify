/**
 * Settings → Shipping (SPEC §10). Owner: WS-A.
 *
 * Merchant-defined flat and price-conditional rates only. Carrier-calculated
 * shipping is a hard out-of-scope stop (SPEC §2) — do not add a provider here.
 *
 * Rates live in the `shops.shippingRates` JSON column rather than a table of
 * their own: a shop has a handful, they are always read together, and every
 * read already has the Shop row in hand.
 */

import { newId } from '@merchant/config/ids';
import { compare } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import {
  type ShippingRate,
  shippingRateSchema,
  type UpsertShippingRateInput,
} from '@merchant/contracts/shops';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';

/**
 * The rates a cart of `subtotal` may choose from, cheapest first.
 *
 * Both bounds are inclusive: a "$50 and up" rate applies at exactly $50, which
 * is how a merchant reads it and how Shopify behaves. Cheapest-first because
 * checkout preselects the first one.
 */
export function eligibleShippingRates(rates: ShippingRate[], subtotal: MoneyDto): ShippingRate[] {
  return rates
    .filter((rate) => {
      if (rate.minOrderSubtotal && compare(subtotal, rate.minOrderSubtotal) < 0) return false;
      if (rate.maxOrderSubtotal && compare(subtotal, rate.maxOrderSubtotal) > 0) return false;
      return true;
    })
    .sort((a, b) => a.price.amount - b.price.amount);
}

/**
 * The rates a shop is created with.
 *
 * Not a nicety: a shop with zero rates has a checkout nobody can finish. E3
 * prices `shippingOptions` from the subtotal alone, so an empty list means
 * `selectedShippingRateId` never leaves null and E4's "Pay now" never enables —
 * the store looks open and silently cannot take an order. Shopify seeds a
 * general rate at signup for exactly this reason; the merchant renames or
 * reprices it in Settings → Shipping, but day one already works.
 *
 * Unconditional on purpose: a `minOrderSubtotal` here would reintroduce the
 * same dead end for every cart below it.
 */
export function defaultShippingRates(currencyCode: string): ShippingRate[] {
  return [
    {
      id: newId('shippingRate'),
      name: 'Standard shipping (3–5 business days)',
      price: { amount: 895, currencyCode },
      minOrderSubtotal: null,
      maxOrderSubtotal: null,
    },
  ];
}

/** Tolerates a column written before a field existed, or hand-edited in SQL. */
function parseRates(value: unknown): ShippingRate[] {
  if (!Array.isArray(value)) return [];
  const parsed = shippingRateSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

async function readRates(db: TenantClient): Promise<ShippingRate[]> {
  const shop = await db.shop.findFirst({ select: { shippingRates: true } });
  return parseRates(shop?.shippingRates);
}

export async function listShippingRates(db: TenantClient): Promise<ShippingRate[]> {
  return (await readRates(db)).sort((a, b) => a.price.amount - b.price.amount);
}

/**
 * Read-modify-write of the JSON column, inside a transaction so two admins
 * saving at once cannot drop one another's rate.
 */
async function mutateRates(
  db: TenantClient,
  shopId: string,
  mutate: (rates: ShippingRate[]) => ShippingRate[],
): Promise<ShippingRate[]> {
  return db.$transaction(async (tx) => {
    const shop = await tx.shop.findFirst({ select: { shippingRates: true } });
    const next = mutate(parseRates(shop?.shippingRates));
    await tx.shop.update({ where: { id: shopId }, data: { shippingRates: next } });
    return next;
  });
}

/**
 * Force every amount onto the shop's own currency.
 *
 * A rate stored in another currency is not a validation nicety: comparing it
 * to a cart subtotal throws (money.ts refuses mixed currencies), so one bad
 * rate would take down the checkout shipping step for every order. The shop
 * has exactly one currency (SPEC §2), so there is nothing to decide.
 */
async function inShopCurrency(
  db: TenantClient,
  input: UpsertShippingRateInput,
): Promise<UpsertShippingRateInput> {
  const shop = await db.shop.findFirst({ select: { currencyCode: true } });
  const currencyCode = shop?.currencyCode ?? input.price.currencyCode;
  const stamp = <T extends MoneyDto | null>(m: T): T =>
    (m === null ? null : { ...m, currencyCode }) as T;

  return {
    ...input,
    price: stamp(input.price),
    minOrderSubtotal: stamp(input.minOrderSubtotal),
    maxOrderSubtotal: stamp(input.maxOrderSubtotal),
  };
}

export async function createShippingRate(
  db: TenantClient,
  shopId: string,
  input: UpsertShippingRateInput,
): Promise<ShippingRate> {
  const rate: ShippingRate = { id: newId('shippingRate'), ...(await inShopCurrency(db, input)) };
  await mutateRates(db, shopId, (rates) => [...rates, rate]);
  return rate;
}

export async function updateShippingRate(
  db: TenantClient,
  shopId: string,
  id: string,
  input: UpsertShippingRateInput,
): Promise<ShippingRate> {
  const updated: ShippingRate = { ...(await inShopCurrency(db, input)), id };
  let found = false;
  await mutateRates(db, shopId, (rates) =>
    rates.map((rate) => {
      if (rate.id !== id) return rate;
      found = true;
      return updated;
    }),
  );
  if (!found) throw notFound('Shipping rate not found.');
  return updated;
}

export async function deleteShippingRate(
  db: TenantClient,
  shopId: string,
  id: string,
): Promise<void> {
  let found = false;
  await mutateRates(db, shopId, (rates) =>
    rates.filter((rate) => {
      if (rate.id === id) found = true;
      return rate.id !== id;
    }),
  );
  if (!found) throw notFound('Shipping rate not found.');
}
