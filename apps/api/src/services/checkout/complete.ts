/**
 * Checkout completion (SPEC §10, §11). Owner: WS-E.
 *
 * The one path in the product where money moves, so the ordering is deliberate:
 *
 *   claim → reserve stock → charge → record order → side effects
 *
 * **Claim first.** A single `updateMany` flips `open → completed`, and only one
 * request can win it. That serializes the whole completion on a row the
 * database already locks, which is what makes a double-clicked Pay button
 * produce one order rather than two. Every failure after the claim puts the
 * checkout back to `open`, because a shopper whose card was declined must be
 * able to try another one.
 *
 * **Reserve before charging.** Taking a shopper's money and then discovering
 * the last unit is gone is far worse than telling them it is gone. Stock moves
 * through B4's `adjustMany`, so the sale leaves the history the inventory
 * drawer reads, and a `deny` variant going negative aborts the whole batch.
 *
 * **Recompute before charging.** The totals the client last saw are a view. A
 * price or tax change between pricing and paying must reach the card.
 */

import { storefrontUrl } from '@merchant/config/env';
import type { CartLine } from '@merchant/contracts/cart';
import type { CompleteCheckoutInput, CompleteCheckoutResponse } from '@merchant/contracts/checkout';
import type { CreateOrderInput } from '@merchant/contracts/orders';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { charge, PaymentError, savePaymentMethod } from '@merchant/pay/router';
import { badRequest, conflict } from '../../lib/errors.ts';
import { findOrCreateByEmail } from '../customers/customers.ts';
import { adjustMany } from '../inventory/adjust.ts';
import { createOrder } from '../orders/create.ts';
import { notifyOrder } from '../orders/notify.ts';
import { assertReadyToPay, findCheckoutRow, priceCheckout } from './checkout.ts';

/** Decline codes the shopper may see. Anything else is a processor problem. */
const SHOPPER_FACING = new Set([
  'declined',
  'insufficient_funds',
  'expired_card',
  'invalid_card',
] as const);

type FailureCode = Extract<CompleteCheckoutResponse, { status: 'failed' }>['code'];

function failureCode(errorCode: string | null): FailureCode {
  return SHOPPER_FACING.has(errorCode as never) ? (errorCode as FailureCode) : 'processor_error';
}

/**
 * The location a sale draws from. One location, the first that fulfils online
 * orders — split-shipment routing is out of scope (SPEC §2), and picking
 * deterministically beats picking cleverly.
 */
async function fulfillingLocationId(db: TenantClient): Promise<string | null> {
  const location = await db.location.findFirst({
    where: { isActive: true, fulfillsOnlineOrders: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return location?.id ?? null;
}

/** Lines that consume tracked stock. `continue` variants oversell by design. */
async function reservableLines(
  db: TenantClient,
  lines: CartLine[],
): Promise<Array<{ variantId: string; quantity: number }>> {
  const variants = await db.productVariant.findMany({
    where: { id: { in: lines.map((line) => line.variantId) } },
    select: { id: true, inventoryPolicy: true },
  });
  const policy = new Map(variants.map((variant) => [variant.id, variant.inventoryPolicy]));

  // `continue` is the merchant explicitly allowing an oversell, so those lines
  // still move stock (the count goes negative and the drawer shows it) — what
  // they must not do is block the sale. adjustMany already encodes that rule.
  return lines
    .filter((line) => policy.has(line.variantId))
    .map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
}

const orderLines = (lines: CartLine[], appliedByLine: Map<string, number>, currencyCode: string) =>
  lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    title: line.title,
    variantTitle: line.variantTitle,
    sku: null,
    imageUrl: line.imageUrl,
    quantity: line.quantity,
    price: line.unitPrice,
    totalDiscount: { amount: appliedByLine.get(line.id) ?? 0, currencyCode },
    requiresShipping: true,
    taxable: true,
  }));

/**
 * The customer behind an order — C4's `findOrCreateByEmail`, which case-folds
 * the email and survives two checkouts racing on the same address. The
 * customers index and E5's account page both read from here.
 */
async function findOrCreateCustomer(
  db: TenantClient,
  shopId: string,
  input: { email: string; phone: string | null; address: Prisma.JsonValue },
): Promise<string> {
  const address = input.address as { firstName?: string; lastName?: string } | null;
  const { id } = await findOrCreateByEmail(db, shopId, {
    email: input.email,
    firstName: address?.firstName,
    lastName: address?.lastName,
    phone: input.phone ?? undefined,
  });
  return id;
}

/**
 * "Save this card for future purchases" (SPEC §11). Links the token that was
 * just charged to the customer, so the admin's charge-saved-card block has
 * something real to pick.
 *
 * **This runs after the money moved, so it must never throw.** The vault row
 * can be gone and the insert can lose a race; either way the order is already
 * paid for and a saved card is a convenience. Failing here would hand the
 * shopper a 500 for a purchase that succeeded.
 *
 * Deduped on what the shopper actually sees — brand, last4, expiry — not on the
 * token: every checkout tokenizes the card afresh, so a repeat buyer who ticks
 * the box each time would otherwise collect an identical row per order and the
 * admin's card picker would fill with copies.
 */
export async function saveCardForCustomer(
  db: TenantClient,
  shopId: string,
  input: { customerId: string; cardTokenId: string },
): Promise<void> {
  try {
    const card = await db.vaultCard.findUnique({
      where: { id: input.cardTokenId },
      select: { brand: true, last4: true, expMonth: true, expYear: true },
    });
    if (!card) return;

    const duplicate = await db.paymentMethod.findFirst({
      where: { customerId: input.customerId, ...card },
      select: { id: true },
    });
    if (duplicate) return;

    await savePaymentMethod(db, shopId, input.customerId, input.cardTokenId);
  } catch {
    // Deliberately swallowed — see above.
  }
}

export async function completeCheckout(
  db: TenantClient,
  shopId: string,
  token: string,
  input: CompleteCheckoutInput,
  options: { cartToken?: string; sessionCustomerId?: string | null } = {},
): Promise<CompleteCheckoutResponse> {
  const existing = await findCheckoutRow(db, token);

  // Already paid: return the order rather than charging again. This is the
  // answer for a refreshed thank-you page and for the loser of a double-click.
  if (existing.status === 'completed' && existing.completedOrderId) {
    return successFor(db, existing.completedOrderId, token);
  }
  if (existing.status !== 'open') {
    throw conflict('This checkout has already been completed.', 'status');
  }
  assertReadyToPay(existing);

  // Claim. Exactly one request gets count 1; everyone else is a duplicate.
  const claim = await db.checkout.updateMany({
    where: { id: existing.id, status: 'open' },
    data: { status: 'completed' },
  });
  if (claim.count === 0) {
    const winner = await findCheckoutRow(db, token);
    if (winner.completedOrderId) return successFor(db, winner.completedOrderId, token);
    throw conflict('This checkout is already being paid for.', 'status');
  }

  // Once the card is charged the checkout must stay closed even if something
  // later fails. Reopening it would let the shopper pay a second time — a
  // double charge is far worse than an order a merchant has to finish by hand.
  let charged = false;
  const release = async () => {
    if (charged) return;
    await db.checkout.updateMany({
      where: { id: existing.id, status: 'completed', completedOrderId: null },
      data: { status: 'open' },
    });
  };

  try {
    const priced = await priceCheckout(db, existing);
    const { totals } = priced.pricing;
    if (priced.lines.length === 0) throw conflict('Your cart is empty.', 'lines');
    if (!priced.pricing.selectedShippingRateId) {
      throw badRequest('A shipping method is required.', 'selectedShippingRateId');
    }

    const locationId = await fulfillingLocationId(db);
    const reservations = locationId ? await reservableLines(db, priced.lines) : [];
    // Marks this attempt's adjustments. A previous declined attempt reserved and
    // released stock against the same checkout, and that history is real — it
    // just is not this order's.
    const reservedAt = new Date();

    if (locationId && reservations.length > 0) {
      // Throws `conflict` when a deny-policy variant would go negative; the
      // whole batch rolls back, so a partial reservation cannot leak.
      await adjustMany(
        db,
        reservations.map((line) => ({
          variantId: line.variantId,
          locationId,
          delta: -line.quantity,
          reason: 'sold' as const,
          referenceId: existing.id,
        })),
      );
    }

    let payment: Awaited<ReturnType<typeof charge>>;
    try {
      payment = await charge(db, shopId, {
        cardTokenId: input.cardTokenId,
        amount: totals.total,
        capture: true,
        // Scoped to this checkout AND this attempt: a double-submit of one
        // click shares the key and charges once, while a retry after a decline
        // is a new attempt and must be allowed to reach the processor.
        idempotencyKey: `${token}-${input.idempotencyKey}`,
        checkoutId: existing.id,
        billingAddress: (priced.row.billingSameAsShipping
          ? priced.row.shippingAddress
          : (priced.row.billingAddress ?? priced.row.shippingAddress)) as never,
      });
    } catch (error) {
      // The router refused before reaching a processor — no card was charged.
      if (error instanceof PaymentError) {
        await releaseStock(db, locationId, reservations, existing.id);
        await release();
        return { status: 'failed', message: error.message, code: 'processor_error' };
      }
      throw error;
    }

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      await releaseStock(db, locationId, reservations, existing.id);
      await release();
      return {
        status: 'failed',
        // The adapter's shopper-facing message, never processor internals.
        message: declineMessage(payment.errorCode),
        code: failureCode(payment.errorCode),
      };
    }

    charged = true;

    const customerId = await findOrCreateCustomer(db, shopId, {
      email: existing.email as string,
      phone: existing.phone,
      address: existing.shippingAddress,
    });

    const appliedByLine = new Map<string, number>();
    for (const applied of priced.pricing.appliedDiscounts) {
      for (const allocation of applied.lineAllocations) {
        appliedByLine.set(
          allocation.lineId,
          (appliedByLine.get(allocation.lineId) ?? 0) + allocation.amount.amount,
        );
      }
    }

    const selectedRate = priced.pricing.shippingOptions.find(
      (option) => option.id === priced.pricing.selectedShippingRateId,
    );

    const orderInput: CreateOrderInput = {
      customerId,
      email: existing.email as string,
      phone: existing.phone,
      currencyCode: priced.currencyCode,
      lineItems: orderLines(priced.lines, appliedByLine, priced.currencyCode),
      totals,
      shippingAddress: existing.shippingAddress as never,
      billingAddress: (existing.billingSameAsShipping
        ? existing.shippingAddress
        : existing.billingAddress) as never,
      shippingLine: selectedRate
        ? {
            title: selectedRate.title,
            // Net of a free-shipping discount, matching `totals.shippingTotal`.
            price: totals.shippingTotal,
            shippingRateId: selectedRate.id,
          }
        : null,
      discountCodes: priced.pricing.appliedDiscounts,
      financialStatus: 'paid',
      note: existing.note,
    };

    const order = await createOrder(db, shopId, orderInput, {
      actor: null,
      orderStatusUrl: await orderStatusUrl(db, token),
    });

    await db.payment.updateMany({ where: { id: payment.id }, data: { orderId: order.id } });

    // The charge ran before the order existed, so D3's `onPaid` seam had no
    // orderId to report. Now that the Payment row points at the order, this is
    // the one place `orders/paid` can fire for a storefront purchase.
    await notifyOrder({
      shopId,
      topic: 'orders/paid',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        total: order.total.amount,
        currencyCode: order.currencyCode,
      },
    });
    await db.checkout.update({
      where: { id: existing.id },
      data: { completedOrderId: order.id, totals: totals as unknown as Prisma.InputJsonValue },
    });

    // Everything past this point has already been paid for: it must never be
    // able to fail the sale.
    await afterSale(db, shopId, {
      orderId: order.id,
      cartToken: options.cartToken ?? null,
      checkoutId: existing.id,
      reservedAt,
      // Only a proven session may file a card under an account. The order's
      // customer is whoever the shopper *typed*, and E5's register claims a
      // guest row by email — so saving on the typed email alone would hand the
      // next person to sign up on that address a stranger's card.
      saveCardFor: input.saveCard && options.sessionCustomerId === customerId ? customerId : null,
      cardTokenId: input.cardTokenId,
    });

    return {
      status: 'success',
      orderId: order.id,
      orderNumber: order.orderNumber,
      confirmationUrl: confirmationUrl(token),
    };
  } catch (error) {
    await release();
    throw error;
  }
}

/** Put back what a failed sale reserved, with the history to explain it. */
async function releaseStock(
  db: TenantClient,
  locationId: string | null,
  reservations: Array<{ variantId: string; quantity: number }>,
  referenceId: string,
): Promise<void> {
  if (!locationId || reservations.length === 0) return;
  await adjustMany(
    db,
    reservations.map((line) => ({
      variantId: line.variantId,
      locationId,
      delta: line.quantity,
      reason: 'restock' as const,
      referenceId,
    })),
  );
}

function confirmationUrl(token: string): string {
  return `/checkouts/${token}/thank-you`;
}

/**
 * Absolute thank-you URL for the confirmation email's button. The storefront
 * gets the relative `confirmationUrl` (it is already on the shop's origin);
 * the email needs the origin too. Null on any failure — the money has already
 * moved by the time this runs, so a missing button must never fail the sale.
 */
async function orderStatusUrl(db: TenantClient, token: string): Promise<string | null> {
  try {
    const shop = await db.shop.findFirst({ select: { slug: true } });
    return shop ? `${storefrontUrl(shop.slug)}${confirmationUrl(token)}` : null;
  } catch {
    return null;
  }
}

async function successFor(
  db: TenantClient,
  orderId: string,
  token: string,
): Promise<CompleteCheckoutResponse> {
  const order = await db.order.findFirst({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw conflict('This checkout has already been completed.', 'status');
  return {
    status: 'success',
    orderId: order.id,
    orderNumber: order.orderNumber,
    confirmationUrl: confirmationUrl(token),
  };
}

function declineMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'insufficient_funds':
      return 'Your card has insufficient funds.';
    case 'expired_card':
      return 'That card has expired.';
    case 'invalid_card':
      return 'That card number is not valid.';
    case 'declined':
      return 'Your card was declined.';
    default:
      return 'We could not process that payment. Please try another card.';
  }
}

/**
 * Post-sale side effects. The money has moved and the order is committed, so
 * every one of these is best-effort: nothing here may turn a paid order into an
 * error in front of the customer.
 *
 * The confirmation email is NOT sent from here: `createOrder` already fires it
 * through WS-C's `notifyOrder` seam, and BullMQ keys the job on the order id —
 * a second enqueue would be silently discarded rather than useful.
 */
async function afterSale(
  db: TenantClient,
  shopId: string,
  input: {
    orderId: string;
    cartToken: string | null;
    checkoutId: string;
    reservedAt: Date;
    /** The customer to save the charged card against, or null to skip. */
    saveCardFor: string | null;
    cardTokenId: string;
  },
): Promise<void> {
  // Empty the cart rather than clearing only the cookie: the browser may still
  // hold the token, and showing a shopper the items they just bought is worse
  // than an empty cart page.
  if (input.cartToken) {
    try {
      await db.cart.updateMany({ where: { token: input.cartToken }, data: { lineItems: [] } });
    } catch {
      // The sale is done; a stale cart is cosmetic.
    }
  }

  // Re-point the sale adjustments at the order, so the inventory drawer links
  // to something a merchant can open. The checkout id got them there first
  // because the order did not exist yet.
  try {
    await db.inventoryAdjustment.updateMany({
      // Only this attempt's. Re-pointing every adjustment on the checkout would
      // hang a declined attempt's reserve/release pair off the order, and the
      // inventory drawer would show a sale that never happened.
      where: { referenceId: input.checkoutId, createdAt: { gte: input.reservedAt } },
      data: { referenceId: input.orderId },
    });
  } catch {
    // Cosmetic linkage only.
  }

  // "Save this card for future purchases" — the whole point of E6, and the only
  // way a `PaymentMethod` row exists outside the seed. Swallows its own errors.
  if (input.saveCardFor) {
    await saveCardForCustomer(db, shopId, {
      customerId: input.saveCardFor,
      cardTokenId: input.cardTokenId,
    });
  }

  // `ordersCount` / `totalSpent` are NOT written here: C4 landed and derives
  // both per request from the order rows (DECISIONS), so the denormalized
  // columns are deliberately unused — a counter written from checkout but not
  // from refund or cancel drifts, and dead writes read as load-bearing.
}
