'use client';

/**
 * `Total sales by product` (SPEC §13; docs/parity/dashboard.md §Chart cards).
 * Owner: WS-G.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import { BlockStack, Card, InlineStack, Text, Thumbnail } from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { NoDataForRange } from './dashboard-filters.tsx';
import { MetricLabel } from './metric-card.tsx';

export function TopProductsCard({ products }: { products: AnalyticsDashboard['topProducts'] }) {
  return (
    <Card>
      <BlockStack gap="400">
        <MetricLabel
          variant="headingSm"
          help="Products ranked by the sales they earned in this period, net of line discounts."
        >
          Total sales by product
        </MetricLabel>
        {products.length === 0 ? (
          <NoDataForRange />
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
                <Text as="span" variant="bodyMd" fontWeight="semibold" numeric>
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
