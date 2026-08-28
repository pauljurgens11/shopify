'use client';

/** Top products by revenue for the range (SPEC §13). Owner: WS-G. */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import { BlockStack, Card, InlineStack, Text, Thumbnail } from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';

export function TopProductsCard({ products }: { products: AnalyticsDashboard['topProducts'] }) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Top products
        </Text>
        {products.length === 0 ? (
          <Text as="p" tone="subdued">
            No sales in this period yet.
          </Text>
        ) : (
          <BlockStack gap="300">
            {products.slice(0, 5).map((product) => (
              <InlineStack key={product.productId} gap="300" blockAlign="center" wrap={false}>
                <Thumbnail
                  size="small"
                  source={product.imageUrl ?? ImageIcon}
                  alt={product.title}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <BlockStack gap="050">
                    <Text as="span" variant="bodyMd" truncate>
                      {product.title}
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {product.unitsSold} sold
                    </Text>
                  </BlockStack>
                </div>
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {format(product.revenue)}
                </Text>
              </InlineStack>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
