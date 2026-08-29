/**
 * Checkout lifecycle (SPEC §10). Owner: WS-E.
 *
 * A checkout is a FROZEN copy of the cart. The cart reprices from live variants
 * on every read (E1); a checkout must not — the shopper is committing to the
 * number in front of them, and a price edit mid-payment that silently changes
 * what the card is charged is indefensible.
 *
 * The cart deliberately survives creation, so an abandoned checkout leaves the
 * shopper's cart where they left it.
 *
 * Pricing lives entirely in `totals.ts`; nothing here computes money.
 */
import { newId, newSecret } from '@merchant/config/ids';
import type { CartLine } from '@merchant/contracts/cart';
import type { Checkout, UpdateCheckoutInput } from '@merchant/contracts/checkout';
import { checkoutSchema } from '@merchant/contracts/checkout';
import type { AddressDto } from '@merchant/contracts/common';
import type { Discount, DiscountPriorUsage } from '@merchant/contracts/discounts';
import { appliedDiscountSchema } from '@merchant/contracts/discounts';
import { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { findCart } from '../cart/cart.ts';
import { computeCheckoutTotals, type PricingResult, type ShopShippingRate } from './totals.ts';

type CheckoutRow = Prisma.CheckoutGetPayload<Record<string, never>>;

/** Shop settings checkout prices from: A4 owns the values, we only read them. */
interface ShopPricingSettings {
  currencyCode: string;
  taxRatePercentage: number;
  rates: ShopShippingRate[];
}

async function pricingSettings(db: TenantClient): Promise<ShopPricingSettings> {
  const shop = await db.shop.findFirst({
    select: { currencyCode: true, taxSettings: true, shippingRates: true },
  });
  if (!shop) throw notFound('Store');

  const tax = (shop.taxSettings ?? {}) as { ratePercentage?: number };
  const rates = Array.isArray(shop.shippingRates)
    ? (shop.shippingRates as unknown as ShopShippingRate[])
    : [];

  return {
    currencyCode: shop.currencyCode,
    // A shop that never opened Settings → Taxes charges no tax, which is the
    // honest default rather than a guess.
    taxRatePercentage: typeof tax.ratePercentage === 'number' ? tax.ratePercentage : 0,
    rates,
  };
}

/**
 * Candidate discounts: every automatic, plus the row for the code the shopper
 * typed. The engine decides which actually apply — including rejecting the
 * typed one — so this only has to be a superset.
 */
async function candidateDiscounts(
  db: TenantClient,
  enteredCode: string | null,
): Promise<Discount[]> {
  const rows = await db.discount.findMany({
    where: enteredCode
      ? { OR: [{ code: null }, { code: { equals: enteredCode, mode: 'insensitive' } }] }
      : { code: null },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    code: row.code,
    type: row.type as Discount['type'],
    valueType: row.valueType as Discount['valueType'],
    value: row.value,
    appliesTo: row.appliesTo as Discount['appliesTo'],
    minimumRequirement: row.minimumRequirement as Discount['minimumRequirement'],
    usageLimit: row.usageLimit,
    oncePerCustomer: row.oncePerCustomer,
    usedCount: row.usedCount,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    status: row.status as Discount['status'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/**
 * C1 enforces `oncePerCustomer` only when told who is buying. The checkout's
 * identity is its email (normalized on write); a guest with no customer row —
 * or no once-per-customer candidate in play — skips the two reads entirely,
 * and omitting the field keeps the engine's guest behavior.
 */
async function priorUsageFor(
  db: TenantClient,
  email: string | null,
  discounts: Discount[],
): Promise<DiscountPriorUsage | undefined> {
  if (!email || !discounts.some((d) => d.oncePerCustomer)) return undefined;

  const customer = await db.customer.findFirst({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!customer) return undefined;

  const counts = await db.discountRedemption.groupBy({
    by: ['discountId'],
    where: { customerId: customer.id, discountId: { in: discounts.map((d) => d.id) } },
    _count: true,
  });
  return Object.fromEntries(counts.map((c) => [c.discountId, c._count]));
}

/** Collection membership per product, so collection-scoped discounts can match. */
async function collectionsByProduct(
  db: TenantClient,
  productIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (productIds.length === 0) return map;

  const rows = await db.collectionProduct.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, collectionId: true },
  });
  for (const row of rows) {
    map.set(row.productId, [...(map.get(row.productId) ?? []), row.collectionId]);
  }
  return map;
}

function snapshotLines(value: Prisma.JsonValue): CartLine[] {
  return Array.isArray(value) ? (value as unknown as CartLine[]) : [];
}

const asAddress = (value: Prisma.JsonValue): AddressDto | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as AddressDto) : null;

/** Everything a response needs: the row, its snapshot, and freshly-priced totals. */
export interface PricedCheckout {
  row: CheckoutRow;
  /** Set only once completed — the thank-you page renders it. */
  completedOrderNumber: number | null;
  /** Derived from the shop — `Checkout` stores no currency of its own. */
  currencyCode: string;
  lines: CartLine[];
  pricing: PricingResult;
  settings: ShopPricingSettings;
}

/**
 * Price a checkout row from scratch. Called on every read, every step update
 * and once more at completion — the client's displayed totals are a view, never
 * an input.
 */
export async function priceCheckout(db: TenantClient, row: CheckoutRow): Promise<PricedCheckout> {
  const lines = snapshotLines(row.cartSnapshot);
  const settings = await pricingSettings(db);
  const [discounts, collectionIdsByProduct] = await Promise.all([
    candidateDiscounts(db, row.discountCode),
    collectionsByProduct(db, [...new Set(lines.map((line) => line.productId))]),
  ]);
  const priorUsage = await priorUsageFor(db, row.email, discounts);

  const pricing = computeCheckoutTotals({
    currencyCode: settings.currencyCode,
    lines,
    collectionIdsByProduct,
    rates: settings.rates,
    selectedShippingRateId: row.shippingRateId,
    taxRatePercentage: settings.taxRatePercentage,
    discounts,
    enteredCode: row.discountCode,
    priorUsage,
    now: new Date(),
  });

  // One extra read, and only for a checkout that has already been paid.
  const completedOrder = row.completedOrderId
    ? await db.order.findFirst({
        where: { id: row.completedOrderId },
        select: {
          orderNumber: true,
          currencyCode: true,
          subtotal: true,
          discountTotal: true,
          shippingTotal: true,
          taxTotal: true,
          total: true,
          discountCodes: true,
        },
      })
    : null;

  // A completed checkout is a receipt: its money is whatever the order recorded
  // at the moment of payment, never a fresh repricing. Repricing here made the
  // thank-you page drift from the charge — a oncePerCustomer code trips
  // priorUsage on the shopper's own order and vanishes from the totals, and any
  // later tax/shipping/discount edit would rewrite the receipt the same way.
  const frozen = completedOrder
    ? (() => {
        const cur = completedOrder.currencyCode;
        const m = (amount: number) => ({ amount, currencyCode: cur });
        return {
          ...pricing,
          totals: {
            subtotal: m(completedOrder.subtotal),
            discountTotal: m(completedOrder.discountTotal),
            shippingTotal: m(completedOrder.shippingTotal),
            taxTotal: m(completedOrder.taxTotal),
            total: m(completedOrder.total),
          },
          appliedDiscounts: appliedDiscountSchema
            .array()
            .catch([])
            .parse(completedOrder.discountCodes ?? []),
          rejectedDiscount: null,
        };
      })()
    : pricing;

  return {
    row,
    lines,
    pricing: frozen,
    settings,
    currencyCode: settings.currencyCode,
    completedOrderNumber: completedOrder?.orderNumber ?? null,
  };
}

export function serializeCheckout(priced: PricedCheckout): Checkout {
  const { row, lines, pricing } = priced;
  return checkoutSchema.parse({
    id: row.id,
    token: row.token,
    status: row.status,
    currencyCode: priced.currencyCode,
    email: row.email,
    phone: row.phone,
    acceptsMarketing: row.acceptsMarketing,
    lines,
    shippingAddress: asAddress(row.shippingAddress),
    billingAddress: asAddress(row.billingAddress),
    billingSameAsShipping: row.billingSameAsShipping,
    shippingOptions: pricing.shippingOptions,
    selectedShippingRateId: pricing.selectedShippingRateId,
    discountCode: row.discountCode,
    appliedDiscounts: pricing.appliedDiscounts,
    rejectedDiscount: pricing.rejectedDiscount,
    totals: pricing.totals,
    completedOrderId: row.completedOrderId,
    completedOrderNumber: priced.completedOrderNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function findCheckoutRow(db: TenantClient, token: string): Promise<CheckoutRow> {
  const row = await db.checkout.findFirst({ where: { token } });
  if (!row) throw notFound('Checkout');
  return row;
}

export async function getCheckout(db: TenantClient, token: string): Promise<Checkout> {
  return serializeCheckout(await priceCheckout(db, await findCheckoutRow(db, token)));
}

export async function createCheckout(
  db: TenantClient,
  shopId: string,
  cartToken: string | undefined,
): Promise<Checkout> {
  const cart = await findCart(db, cartToken);
  if (!cart) throw notFound('Cart');
  // Paying for nothing is a bad request the UI should never send, but a stale
  // tab can: an empty checkout would price to zero and charge a card for it.
  if (cart.lines.length === 0) throw conflict('Your cart is empty.', 'cartToken');

  const row = await db.checkout.create({
    data: {
      id: newId('checkout'),
      shopId,
      // Opaque: this token is the URL of the checkout page and the payment's
      // idempotency scope, so it must not be guessable from a neighbouring one.
      token: `chk_${newSecret(24)}`,
      // Frozen here. Everything downstream prices from this, not the cart.
      cartSnapshot: cart.lines as unknown as Prisma.InputJsonValue,
      discountCode: cart.discountCode,
      status: 'open',
    },
  });

  return serializeCheckout(await priceCheckout(db, row));
}

/**
 * Apply a step update and reprice. Partial by design — E4 saves each section as
 * the shopper fills it in, and every save has to return totals that already
 * reflect it.
 */
export async function updateCheckout(
  db: TenantClient,
  token: string,
  input: UpdateCheckoutInput,
): Promise<Checkout> {
  const existing = await findCheckoutRow(db, token);
  if (existing.status !== 'open') {
    throw conflict('This checkout has already been completed.', 'status');
  }

  const data: Prisma.CheckoutUpdateInput = {};
  if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.acceptsMarketing !== undefined) data.acceptsMarketing = input.acceptsMarketing;
  if (input.shippingAddress !== undefined) {
    data.shippingAddress = input.shippingAddress as unknown as Prisma.InputJsonValue;
  }
  if (input.billingAddress !== undefined) {
    data.billingAddress =
      input.billingAddress === null
        ? Prisma.JsonNull
        : (input.billingAddress as unknown as Prisma.InputJsonValue);
  }
  if (input.billingSameAsShipping !== undefined) {
    data.billingSameAsShipping = input.billingSameAsShipping;
  }
  if (input.selectedShippingRateId !== undefined)
    data.shippingRateId = input.selectedShippingRateId;
  if (input.discountCode !== undefined) {
    data.discountCode = input.discountCode === null ? null : input.discountCode.trim();
  }
  if (input.note !== undefined) data.note = input.note;

  const row = await db.checkout.update({ where: { id: existing.id }, data });
  const priced = await priceCheckout(db, row);

  // A rate the shopper no longer qualifies for is dropped rather than silently
  // priced at zero — see totals.ts. Persist that so the next read agrees.
  if (row.shippingRateId !== priced.pricing.selectedShippingRateId) {
    const corrected = await db.checkout.update({
      where: { id: row.id },
      data: { shippingRateId: priced.pricing.selectedShippingRateId },
    });
    return serializeCheckout({ ...priced, row: corrected });
  }

  return serializeCheckout(priced);
}

/** Everything `complete` needs present before it may charge a card. */
export function assertReadyToPay(row: CheckoutRow): void {
  if (!row.email) throw badRequest('An email address is required.', 'email');
  if (!asAddress(row.shippingAddress))
    throw badRequest('A shipping address is required.', 'shippingAddress');
  if (!row.shippingRateId)
    throw badRequest('A shipping method is required.', 'selectedShippingRateId');
}
