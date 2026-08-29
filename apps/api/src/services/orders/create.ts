/**
 * `createOrder` — the entry point E3 calls when a checkout completes, and the
 * only supported way an Order row comes into existence.
 *
 * This service RECORDS; it does not price. Totals arrive already computed by
 * the discounts engine (C1) and the checkout (E3); re-deriving them here would
 * mean two implementations of the money math that can disagree — so instead we
 * assert they balance and store them verbatim.
 *
 * Owner: WS-C.
 */
import { ORDER_NUMBER_START } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { format } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import {
  type CreateOrderInput,
  createOrderInput,
  type OrderDetail,
} from '@merchant/contracts/orders';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest } from '../../lib/errors.ts';
import { recordPurchaseEvent } from '../analytics/record.ts';
import { loadOrderDetail } from './detail.ts';
import { notifyOrder } from './notify.ts';

type Parsed = ReturnType<typeof createOrderInput.parse>;

/**
 * Every amount on the order must be in the order's own currency. The database
 * stores bare integers with one currency on the order row, so a mismatch here
 * is not a validation nicety — it silently becomes the wrong number.
 */
function assertCurrency(currencyCode: string, amounts: Array<[string, MoneyDto]>): void {
  for (const [field, value] of amounts) {
    if (value.currencyCode !== currencyCode) {
      throw badRequest(`Expected ${field} in ${currencyCode}, got ${value.currencyCode}.`, field);
    }
  }
}

/**
 * `subtotal - discountTotal + shippingTotal + taxTotal === total`.
 *
 * Cheap, and it turns an upstream pricing bug into a 400 at the moment it
 * happens instead of an order that is a cent wrong forever. `shippingTotal` is
 * already net of any free-shipping discount (see DECISIONS.md), which is why
 * shipping is added rather than discounted again here.
 */
function assertTotalsBalance(totals: Parsed['totals']): void {
  const expected =
    totals.subtotal.amount -
    totals.discountTotal.amount +
    totals.shippingTotal.amount +
    totals.taxTotal.amount;
  if (expected !== totals.total.amount) {
    throw badRequest(
      `Order total ${totals.total.amount} does not balance: subtotal - discount + shipping + tax = ${expected}.`,
      'totals.total',
    );
  }
}

/**
 * Make sure the shop has a sequence row before the transaction opens.
 *
 * Signup creates it, but a shop seeded or migrated in some other way may not
 * have one, and a failed INSERT inside the transaction would abort the whole
 * order — Postgres rolls back the statement AND everything after it.
 *
 * `createMany({ skipDuplicates })` compiles to INSERT … ON CONFLICT DO NOTHING,
 * so two first-ever checkouts racing here both succeed rather than one of them
 * catching a unique violation.
 */
async function ensureSequence(db: TenantClient, shopId: string): Promise<void> {
  await db.orderSequence.createMany({
    data: [{ shopId, next: ORDER_NUMBER_START }],
    skipDuplicates: true,
  });
}

export async function createOrder(
  db: TenantClient,
  shopId: string,
  input: CreateOrderInput,
  options: { actor?: string | null; orderStatusUrl?: string | null } = {},
): Promise<OrderDetail> {
  const data = createOrderInput.parse(input);
  const currency = data.currencyCode;

  assertCurrency(currency, [
    ['subtotal', data.totals.subtotal],
    ['discountTotal', data.totals.discountTotal],
    ['shippingTotal', data.totals.shippingTotal],
    ['taxTotal', data.totals.taxTotal],
    ['total', data.totals.total],
    ...data.lineItems.flatMap(
      (item, i): Array<[string, MoneyDto]> => [
        [`lineItems.${i}.price`, item.price],
        ...(item.totalDiscount
          ? ([[`lineItems.${i}.totalDiscount`, item.totalDiscount]] as Array<[string, MoneyDto]>)
          : []),
      ],
    ),
  ]);
  assertTotalsBalance(data.totals);

  await ensureSequence(db, shopId);

  const orderId = newId('order');

  const order = await db.$transaction(async (tx) => {
    // UPDATE … SET next = next + 1 RETURNING takes a row lock, so two checkouts
    // completing in the same millisecond serialize here instead of colliding on
    // the unique (shopId, orderNumber) index.
    const sequence = await tx.orderSequence.update({
      where: { shopId },
      data: { next: { increment: 1 } },
    });
    const orderNumber = sequence.next - 1;

    const created = await tx.order.create({
      data: {
        id: orderId,
        shopId,
        orderNumber,
        customerId: data.customerId,
        email: data.email,
        phone: data.phone,
        currencyCode: currency,

        subtotal: data.totals.subtotal.amount,
        discountTotal: data.totals.discountTotal.amount,
        shippingTotal: data.totals.shippingTotal.amount,
        taxTotal: data.totals.taxTotal.amount,
        total: data.totals.total.amount,

        financialStatus: data.financialStatus,
        shippingAddress: data.shippingAddress ?? undefined,
        billingAddress: data.billingAddress ?? undefined,
        shippingLine: data.shippingLine ?? undefined,
        discountCodes: data.discountCodes,
        note: data.note,
        tags: data.tags,
        // zod types a free-form JSON column as Record<string, unknown>; Prisma
        // wants InputJsonValue. Without the cast the generic silently widens
        // and `include` stops being reflected in the result type.
        metadata: data.metadata as Prisma.InputJsonObject,

        lineItems: {
          // shopId is set explicitly: only top-level `data` is guaranteed to be
          // stamped by the tenant client (CLAUDE.md §9).
          create: data.lineItems.map((item) => ({
            id: newId('lineItem'),
            shopId,
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            variantTitle: item.variantTitle,
            sku: item.sku,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            price: item.price.amount,
            totalDiscount: item.totalDiscount?.amount ?? 0,
            requiresShipping: item.requiresShipping,
            taxable: item.taxable,
          })),
        },
        events: {
          create: [
            {
              id: newId('event'),
              shopId,
              type: 'order_placed',
              message: `Order #${orderNumber} was placed.`,
              // null actor = the system placed it, which is every checkout.
              actor: options.actor ?? null,
            },
            // An order recorded as already paid (every completed checkout) gets
            // its capture on the timeline too — `payment_captured` was a
            // producer-less enum member, and DEMO.md's beat 6 points at this
            // exact entry ("order placed, payment captured").
            ...(data.financialStatus === 'paid'
              ? [
                  {
                    id: newId('event'),
                    shopId,
                    type: 'payment_captured' as const,
                    message: `A ${format(data.totals.total)} payment was captured.`,
                    actor: options.actor ?? null,
                  },
                ]
              : []),
          ],
        },
      },
      include: { lineItems: true, events: { orderBy: { createdAt: 'asc' } } },
    });

    // Redemptions, not just a counter: `oncePerCustomer` and a cancelled order's
    // give-back both need to know WHO used the code (schema note on the model).
    for (const applied of data.discountCodes) {
      // A code that took nothing off (minimum not met, zero-value line) must
      // not burn one of its limited uses.
      if (applied.amount.amount === 0) continue;
      // updateMany rather than update: a discount deleted between pricing and
      // payment must not roll back a paid order. The usedCount guard compares
      // against the row's own usageLimit column, so two checkouts racing for
      // the last use cannot push the counter past the limit.
      await tx.discount.updateMany({
        where: {
          id: applied.discountId,
          OR: [{ usageLimit: null }, { usedCount: { lt: tx.discount.fields.usageLimit } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      await tx.discountRedemption.createMany({
        data: [
          {
            id: newId('event'),
            shopId,
            discountId: applied.discountId,
            orderId: created.id,
            customerId: data.customerId,
            amount: applied.amount.amount,
          },
        ],
        skipDuplicates: true,
      });
    }

    return created;
  });

  // Revenue the dashboard can trust: the beacon drops browser-sent purchases,
  // so this is the only place a `purchase` event is born (SPEC §13).
  await recordPurchaseEvent(db, shopId, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    total: order.total,
    createdAt: order.createdAt,
  });

  await notifyOrder({
    shopId,
    topic: 'orders/create',
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
      currencyCode: order.currencyCode,
    },
    orderStatusUrl: options.orderStatusUrl ?? null,
  });

  return loadOrderDetail(db, order.id);
}
