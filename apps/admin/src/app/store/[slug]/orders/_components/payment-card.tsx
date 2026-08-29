'use client';

/**
 * The payment card (PARITY.md → Order detail): Subtotal / Discount / Shipping /
 * Tax rows, bold Total, then what the customer actually paid — and what is
 * still owed or has gone back. Owner: WS-C.
 *
 * Every figure is an integer from the API rendered through `format()`. Nothing
 * here is recomputed in the browser (CLAUDE.md §5).
 */
import { format } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import type { OrderDetail } from '@merchant/contracts/orders';
import { BlockStack, Box, Card, Divider, InlineStack, Text } from '@shopify/polaris';
import { capturedTotal, financialBadge, itemCountLabel } from './status.ts';

function Row({
  label,
  value,
  detail,
  strong,
}: {
  label: string;
  value: MoneyDto;
  detail?: string;
  strong?: boolean;
}) {
  return (
    <InlineStack align="space-between" blockAlign="center" gap="400">
      <InlineStack gap="200">
        <Text as="span" variant="bodyMd" fontWeight={strong ? 'semibold' : 'regular'}>
          {label}
        </Text>
        {detail ? (
          <Text as="span" variant="bodySm" tone="subdued">
            {detail}
          </Text>
        ) : null}
      </InlineStack>
      <Text as="span" variant="bodyMd" numeric fontWeight={strong ? 'semibold' : 'regular'}>
        {format(value)}
      </Text>
    </InlineStack>
  );
}

export function PaymentCard({ order }: { order: OrderDetail }) {
  const currencyCode = order.total.currencyCode;
  const paid = {
    amount: order.total.amount - order.refundedTotal.amount,
    currencyCode,
  };
  const refunded = order.refundedTotal.amount > 0;
  const captured = capturedTotal(order.payments, currencyCode);
  const outstanding = { amount: order.total.amount - captured.amount, currencyCode };
  // Nothing is outstanding on an order the merchant closed out: cancelled,
  // voided, or fully refunded. Showing "Outstanding $427.49" there is a lie.
  const showOutstanding =
    outstanding.amount > 0 &&
    !order.cancelledAt &&
    order.financialStatus !== 'voided' &&
    order.financialStatus !== 'refunded';

  return (
    <Card>
      <BlockStack gap="400">
        {/* The heading is the payment status in PARITY.md's exact wording —
            "Paid" on a pending order, or "Partially refunded" on a fully
            refunded one, both read as bugs to anyone who knows Shopify.
            `Refund` lives top-right on the page, not in this card. */}
        <Text as="h2" variant="headingMd">
          {financialBadge(order.financialStatus).label}
        </Text>

        <BlockStack gap="200">
          <Row
            label="Subtotal"
            value={order.subtotal}
            detail={itemCountLabel(order.lineItems.reduce((n, l) => n + l.quantity, 0))}
          />
          {order.discountTotal.amount > 0 ? (
            <Row
              label="Discount"
              value={{ amount: -order.discountTotal.amount, currencyCode }}
              detail={order.discountCodes.map((d) => d.code).join(', ') || undefined}
            />
          ) : null}
          <Row
            label="Shipping"
            value={order.shippingTotal}
            detail={order.shippingLine?.title ?? undefined}
          />
          <Row label="Tax" value={order.taxTotal} />
          <Divider />
          <Row label="Total" value={order.total} strong />
        </BlockStack>

        <Divider />

        <BlockStack gap="200">
          <Row label="Paid by customer" value={captured} />
          {refunded ? (
            <Row label="Refunded" value={{ amount: -order.refundedTotal.amount, currencyCode }} />
          ) : null}
          {showOutstanding ? <Row label="Outstanding" value={outstanding} strong /> : null}
          {refunded ? <Row label="Net payment" value={paid} strong /> : null}
        </BlockStack>

        {order.payments.length > 0 ? (
          <Box>
            <Text as="p" variant="bodySm" tone="subdued">
              {order.payments.length === 1
                ? `Paid with ${order.payments[0]?.processor ?? 'card'}`
                : `${order.payments.length} payments`}
            </Text>
          </Box>
        ) : null}
      </BlockStack>
    </Card>
  );
}
