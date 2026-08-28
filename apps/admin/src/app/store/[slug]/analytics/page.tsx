'use client';

/**
 * Analytics dashboard (SPEC §9, §13; PARITY.md §Home & Analytics). Owner: WS-G.
 *
 * One request feeds every card — G2 returns the whole dashboard in a single
 * `analyticsDashboardResponse`, so the page has one loading state rather than
 * six racing spinners. `Live view` is the exception: it polls on its own.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import { BlockStack, Card, Grid, InlineStack, Layout, Page, Select, Text } from '@shopify/polaris';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../lib/api.ts';
import { FunnelCard } from './funnel-card.tsx';
import { LiveCard } from './live-card.tsx';
import { MetricCard } from './metric-card.tsx';
import {
  deltaPercent,
  formatPercent,
  RANGE_OPTIONS,
  type RangePreset,
  rangeQueryString,
} from './range.ts';
import { SalesChart } from './sales-chart.tsx';
import { TopProductsCard } from './top-products-card.tsx';

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>('30d');

  // Pinned per preset so the range does not slide under the user mid-session,
  // and so the query key stays stable across re-renders.
  const query = useMemo(() => rangeQueryString(preset, new Date()), [preset]);

  const { data, isLoading, error } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', preset],
    `/admin/api/analytics?${query}`,
  );

  if (isLoading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <Page title="Analytics">
        <Card>
          <Text as="p" tone="subdued">
            {error?.message ?? 'Analytics are unavailable right now.'}
          </Text>
        </Card>
      </Page>
    );
  }

  const { summary, funnel } = data;
  const currencyCode = summary.totalSales.currencyCode;
  const comparison = summary.comparison;

  return (
    <Page
      title="Analytics"
      primaryAction={
        <Select
          label="Date range"
          labelHidden
          options={RANGE_OPTIONS}
          value={preset}
          onChange={(value) => setPreset(value as RangePreset)}
        />
      }
    >
      <BlockStack gap="400">
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Total sales"
              value={format(summary.totalSales)}
              delta={
                comparison
                  ? deltaPercent(summary.totalSales.amount, comparison.totalSales.amount)
                  : null
              }
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Orders"
              value={summary.orderCount.toLocaleString('en-US')}
              delta={comparison ? deltaPercent(summary.orderCount, comparison.orderCount) : null}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Conversion rate"
              value={formatPercent(summary.conversionRate)}
              delta={null}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Average order value"
              value={format(summary.averageOrderValue)}
              delta={null}
            />
          </Grid.Cell>
        </Grid>

        <SalesChart
          points={data.salesOverTime}
          currencyCode={currencyCode}
          total={summary.totalSales.amount}
        />

        <Layout>
          <Layout.Section variant="oneHalf">
            <BlockStack gap="400">
              <TopProductsCard products={data.topProducts} />
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Sales by channel
                  </Text>
                  {data.salesByChannel.map((channel) => (
                    <InlineStack key={channel.channel} align="space-between">
                      <Text as="span" variant="bodyMd">
                        {channel.channel}
                      </Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {format(channel.revenue)}
                      </Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <BlockStack gap="400">
              <FunnelCard funnel={funnel} />
              <LiveCard />
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
