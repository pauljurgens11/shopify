'use client';

/**
 * `Total sales breakdown` — the narrow card beside the hero chart
 * (docs/parity/dashboard.md §Chart cards). Owner: WS-G.
 *
 * A vertical list of `label · value · delta` rows: labels are links to the page
 * the number comes from, values are right-aligned and tabular, and alternating
 * rows carry a very light fill.
 *
 * The rows tie out — `netSales = grossSales - discounts` and
 * `totalSales = netSales + shipping + taxes` — because every order satisfies
 * `subtotal - discount + shipping + tax === total`. `Total sales` here is the
 * same number as the `Total sales` tile and the chart headline, deliberately:
 * a breakdown that disagrees with the figure above it is worse than none.
 *
 * Shopify also lists `Sales reversals` and `Return fees`. We render neither:
 * our `sales` metric is gross of refunds everywhere else in the app, so a
 * returns row would be a number the total above it does not reflect
 * (DECISIONS.md).
 */
import { format } from '@merchant/config/money';
import type { SalesBreakdown } from '@merchant/contracts/analytics';
import { BlockStack, Box, Card, InlineStack, Link, Text } from '@shopify/polaris';
import { NoDataForRange } from './dashboard-filters.tsx';
import { DeltaIndicator, MetricLabel } from './metric-card.tsx';
import { deltaPercent } from './range.ts';

type RowKey = keyof SalesBreakdown;

const ROWS: { key: RowKey; label: string; href: (slug: string) => string; negative?: boolean }[] = [
  { key: 'grossSales', label: 'Gross sales', href: (slug) => `/store/${slug}/orders` },
  {
    key: 'discounts',
    label: 'Discounts',
    href: (slug) => `/store/${slug}/discounts`,
    negative: true,
  },
  { key: 'netSales', label: 'Net sales', href: (slug) => `/store/${slug}/orders` },
  {
    key: 'shippingCharges',
    label: 'Shipping charges',
    href: (slug) => `/store/${slug}/settings/shipping`,
  },
  { key: 'taxes', label: 'Taxes', href: (slug) => `/store/${slug}/settings/taxes` },
  { key: 'totalSales', label: 'Total sales', href: (slug) => `/store/${slug}/orders` },
];

export function SalesBreakdownCard({
  breakdown,
  comparison,
  slug,
}: {
  breakdown: SalesBreakdown;
  /** The previous period, or null when comparison is off. */
  comparison: SalesBreakdown | null;
  slug: string;
}) {
  const empty = ROWS.every(({ key }) => breakdown[key].amount === 0);

  return (
    <Card padding="0">
      <BlockStack gap="200">
        <Box paddingInline="400" paddingBlockStart="400">
          <MetricLabel
            variant="headingSm"
            help="Where the period’s total sales came from. Net sales is gross sales less discounts; total sales adds shipping and tax."
          >
            Total sales breakdown
          </MetricLabel>
        </Box>

        {empty ? (
          <Box paddingBlockEnd="400">
            <NoDataForRange />
          </Box>
        ) : (
          <Box paddingBlockEnd="200">
            {ROWS.map((row, index) => {
              const money = breakdown[row.key];
              const previous = comparison?.[row.key];
              return (
                <Box
                  key={row.key}
                  background={index % 2 === 1 ? 'bg-surface-secondary' : undefined}
                  paddingInline="400"
                  paddingBlock="200"
                >
                  <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
                    <Link url={row.href(slug)} removeUnderline>
                      {row.label}
                    </Link>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Text as="span" variant="bodyMd" numeric>
                        {/* Discounts reduce the total, so they read as -$40.00
                            rather than as revenue the store took in. */}
                        {row.negative && money.amount !== 0 ? '-' : ''}
                        {format(money)}
                      </Text>
                      <DeltaIndicator
                        delta={previous ? deltaPercent(money.amount, previous.amount) : null}
                      />
                    </InlineStack>
                  </InlineStack>
                </Box>
              );
            })}
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
