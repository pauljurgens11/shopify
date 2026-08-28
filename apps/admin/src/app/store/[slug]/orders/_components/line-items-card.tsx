'use client';

/**
 * The fulfillment card (PARITY.md → Order detail). Owner: WS-C.
 *
 * Shopify groups line items by what still has to ship: an "Unfulfilled" card
 * carrying the "Fulfill items" button, then a card per fulfillment showing
 * what went out and its tracking.
 */
import { format } from '@merchant/config/money';
import type { Fulfillment, OrderDetail, OrderLineItem } from '@merchant/contracts/orders';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Link,
  Text,
  Thumbnail,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { remainingToFulfil } from './status.ts';

function LineRow({ line, quantity }: { line: OrderLineItem; quantity: number }) {
  return (
    <InlineStack gap="400" blockAlign="start" wrap={false} align="space-between">
      <InlineStack gap="300" blockAlign="start" wrap={false}>
        <Thumbnail source={line.imageUrl ?? ImageIcon} alt={line.title} size="small" />
        <BlockStack gap="050">
          <Text as="span" variant="bodyMd" fontWeight="medium">
            {line.title}
          </Text>
          {line.variantTitle ? (
            <Text as="span" variant="bodySm" tone="subdued">
              {line.variantTitle}
            </Text>
          ) : null}
          {line.sku ? (
            <Text as="span" variant="bodySm" tone="subdued">
              SKU: {line.sku}
            </Text>
          ) : null}
        </BlockStack>
      </InlineStack>

      <InlineStack gap="600" blockAlign="start" wrap={false}>
        <Text as="span" variant="bodySm" tone="subdued">
          {format(line.price)} × {quantity}
        </Text>
        <Text as="span" variant="bodyMd" numeric>
          {format({
            amount:
              line.price.amount * quantity -
              (quantity === line.quantity ? line.totalDiscount.amount : 0),
            currencyCode: line.price.currencyCode,
          })}
        </Text>
      </InlineStack>
    </InlineStack>
  );
}

export function LineItemsCards({ order, fulfilHref }: { order: OrderDetail; fulfilHref: string }) {
  const byId = new Map(order.lineItems.map((line) => [line.id, line]));
  const unfulfilled = order.lineItems
    .map((line) => ({ line, quantity: remainingToFulfil(line) }))
    .filter((entry) => entry.quantity > 0);

  const shipped = order.fulfillments.filter((f) => f.status !== 'cancelled');

  return (
    <BlockStack gap="400">
      {unfulfilled.length > 0 ? (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Badge tone="attention" progress="incomplete">
                  Unfulfilled
                </Badge>
                <Text as="span" variant="bodySm" tone="subdued">
                  {unfulfilled.reduce((sum, e) => sum + e.quantity, 0)} items
                </Text>
              </InlineStack>
              {order.cancelledAt ? null : (
                <Button variant="primary" url={fulfilHref}>
                  Fulfill items
                </Button>
              )}
            </InlineStack>
            <BlockStack gap="400">
              {unfulfilled.map(({ line, quantity }) => (
                <LineRow key={line.id} line={line} quantity={quantity} />
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      ) : null}

      {shipped.map((fulfillment: Fulfillment) => (
        <Card key={fulfillment.id}>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Badge tone="success" progress="complete">
                Fulfilled
              </Badge>
              {fulfillment.trackingNumber ? (
                <Text as="span" variant="bodySm" tone="subdued">
                  Tracking:{' '}
                  {fulfillment.trackingUrl ? (
                    <Link url={fulfillment.trackingUrl} target="_blank">
                      {fulfillment.trackingNumber}
                    </Link>
                  ) : (
                    fulfillment.trackingNumber
                  )}
                </Text>
              ) : null}
            </InlineStack>
            <BlockStack gap="400">
              {fulfillment.lineItems.map((entry) => {
                const line = byId.get(entry.lineItemId);
                return line ? (
                  <LineRow key={entry.lineItemId} line={line} quantity={entry.quantity} />
                ) : null;
              })}
            </BlockStack>
          </BlockStack>
        </Card>
      ))}

      {unfulfilled.length === 0 && shipped.length === 0 ? (
        <Card>
          <Box paddingBlock="400">
            <Text as="p" tone="subdued" alignment="center">
              Nothing left to fulfil on this order.
            </Text>
          </Box>
        </Card>
      ) : null}
    </BlockStack>
  );
}
