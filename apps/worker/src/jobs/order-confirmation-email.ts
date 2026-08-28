/**
 * Order confirmation email (SPEC §13). Owner: WS-G.
 *
 * The payload carries ids only — totals are re-read here, so a retry can never
 * mail a stale snapshot. Rendering is in `emails/order-confirmation.ts`.
 */
import { QUEUES } from '@merchant/config/constants';
import { money } from '@merchant/config/money';
import { JOB_NAMES } from '@merchant/config/queue';
import { addressSchema } from '@merchant/contracts/common';
import { orderConfirmationEmailJobSchema } from '@merchant/contracts/jobs';
import { dbForShop } from '@merchant/db/tenant';
import { renderOrderConfirmation } from '../emails/order-confirmation.ts';
import { logger } from '../lib/logger.ts';
import { sendMail } from '../lib/mailer.ts';
import type { JobContext, JobDefinition } from './types.ts';

/** `shippingLine` is a JSON column; only the title is needed here. */
function shippingMethodOf(shippingLine: unknown): string | null {
  if (shippingLine && typeof shippingLine === 'object' && 'title' in shippingLine) {
    const { title } = shippingLine as { title?: unknown };
    if (typeof title === 'string' && title.length > 0) return title;
  }
  return null;
}

async function handler(raw: unknown, ctx: JobContext): Promise<void> {
  const job = orderConfirmationEmailJobSchema.parse(raw);
  const db = dbForShop(job.shopId);

  const order = await db.order.findUnique({
    where: { id: job.orderId },
    include: {
      // ULIDs sort chronologically; createdAt ties within one transaction.
      lineItems: { orderBy: { id: 'asc' } },
      customer: { select: { firstName: true } },
    },
  });
  if (!order) {
    // Cancelled-and-purged, or a job left over from a reseed. Not worth retrying.
    logger.warn('order confirmation for a missing order — dropping', { orderId: job.orderId });
    return;
  }

  const shop = await db.shop.findUnique({ where: { id: job.shopId }, select: { name: true } });
  if (!shop) {
    logger.warn('order confirmation for a missing shop — dropping', { shopId: job.shopId });
    return;
  }

  const shippingAddress = addressSchema.safeParse(order.shippingAddress);
  const currency = order.currencyCode;

  const rendered = renderOrderConfirmation({
    shopName: shop.name,
    orderNumber: order.orderNumber,
    customerName: order.customer?.firstName ?? shippingAddress.data?.firstName ?? null,
    currencyCode: currency,
    lineItems: order.lineItems.map((line) => ({
      title: line.title,
      variantTitle: line.variantTitle,
      quantity: line.quantity,
      price: money(line.price, currency),
      totalDiscount: money(line.totalDiscount, currency),
    })),
    subtotal: money(order.subtotal, currency),
    discountTotal: money(order.discountTotal, currency),
    shippingTotal: money(order.shippingTotal, currency),
    taxTotal: money(order.taxTotal, currency),
    total: money(order.total, currency),
    shippingAddress: shippingAddress.success ? shippingAddress.data : null,
    shippingMethod: shippingMethodOf(order.shippingLine),
    orderStatusUrl: job.orderStatusUrl,
  });

  await sendMail(
    { to: order.email, fromName: shop.name, ...rendered },
    { fallbackToConsole: ctx.attempt >= ctx.maxAttempts },
  );
}

export const orderConfirmationEmailJob: JobDefinition = {
  name: JOB_NAMES.orderConfirmationEmail,
  queue: QUEUES.email,
  handler,
};
