'use client';

/**
 * Marketing (SPEC §9: "render, minimal page"). Owner: WS-H (H3).
 *
 * Minimal is not the same as unfinished. Campaign management is out of scope
 * (SPEC §2 rules out marketing email), so this page does the one honest thing a
 * marketing overview can do here: report how the store actually performed over
 * the last 30 days, from the same analytics report the dashboard reads, and
 * point at the promotion tool that *does* exist. No "coming soon" copy, and no
 * button that goes nowhere (SPEC §5: dead controls are removed, not disabled).
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import { BlockStack, Box, Button, Card, Grid, Page, Text } from '@shopify/polaris';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../lib/api.ts';
import { MetricCard } from '../analytics/metric-card.tsx';
import { averageOrderValueOf, deltaPercent, rangeQueryString } from '../analytics/range.ts';

export default function MarketingPage() {
  const { slug } = useParams<{ slug: string }>();
  const query = useMemo(() => rangeQueryString('30d', new Date()), []);

  const { data, isLoading } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', '30d'],
    `/admin/api/analytics?${query}`,
  );

  if (isLoading) return <PageSkeleton />;

  const summary = data?.summary;
  const comparison = summary?.comparison ?? null;
  const currencyCode = summary?.totalSales.currencyCode ?? 'USD';

  return (
    <Page title="Marketing">
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Last 30 days
        </Text>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
            <MetricCard
              label="Online store sessions"
              value={(summary?.sessionCount ?? 0).toLocaleString('en-US')}
              delta={
                summary && comparison
                  ? deltaPercent(summary.sessionCount, comparison.sessionCount)
                  : null
              }
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
            <MetricCard
              label="Orders"
              value={(summary?.orderCount ?? 0).toLocaleString('en-US')}
              delta={
                summary && comparison
                  ? deltaPercent(summary.orderCount, comparison.orderCount)
                  : null
              }
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}>
            <MetricCard
              label="Average order value"
              value={format(summary?.averageOrderValue ?? { amount: 0, currencyCode })}
              delta={
                summary && comparison
                  ? deltaPercent(
                      summary.averageOrderValue.amount,
                      averageOrderValueOf(comparison.totalSales.amount, comparison.orderCount),
                    )
                  : null
              }
            />
          </Grid.Cell>
        </Grid>

        <Card>
          <Box padding="800">
            <BlockStack gap="200" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Run a promotion
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Discount codes are how you promote your store on Merchant. Create one, then share it
                wherever your customers already are.
              </Text>
              <Box paddingBlockStart="300">
                <Button variant="primary" url={`/store/${slug}/discounts/new`}>
                  Create discount
                </Button>
              </Box>
            </BlockStack>
          </Box>
        </Card>
      </BlockStack>
    </Page>
  );
}
