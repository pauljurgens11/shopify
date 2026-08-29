'use client';

/**
 * Analytics dashboard (SPEC §9, §13; docs/parity/dashboard.md). Owner: WS-G.
 *
 * One request feeds every card — G2 returns the whole dashboard in a single
 * `analyticsDashboardResponse`, so the page has one loading state rather than
 * six racing spinners. `Live view` is the exception: it polls on its own.
 *
 * Layout follows the parity capture: a row of filter PILLS above the content
 * and outside any card (range, comparison period, currency), then four equal
 * metric tiles, then a wide chart card beside a narrow breakdown list, then a
 * three-column row of smaller cards.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import {
  BlockStack,
  Box,
  Card,
  Grid,
  InlineStack,
  Layout,
  Page,
  SkeletonBodyText,
  SkeletonDisplayText,
  Text,
} from '@shopify/polaris';
import { ChartVerticalIcon } from '@shopify/polaris-icons';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/shell/page-header.tsx';
import { useApiQuery } from '../../../../lib/api.ts';
import { SalesBreakdownCard } from './breakdown-card.tsx';
import { DashboardFilterRow, NoDataForRange, useDashboardFilters } from './dashboard-filters.tsx';
import { FunnelCard } from './funnel-card.tsx';
import { LiveCard } from './live-card.tsx';
import { METRIC_HELP, MetricCard, MetricLabel } from './metric-card.tsx';
import { averageOrderValueOf, deltaPercent } from './range.ts';
import { SalesChart } from './sales-chart.tsx';
import { TopProductsCard } from './top-products-card.tsx';

export default function AnalyticsPage() {
  const slug = String(useParams().slug ?? '');
  const filters = useDashboardFilters('30d');

  // keepPreviousData: switching the range keeps the previous period's cards on
  // screen while the new one loads, instead of flashing back to the skeleton.
  const { data, isLoading, error } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', filters.query],
    `/admin/api/analytics?${filters.query}`,
    { keepPreviousData: true },
  );

  // The pills render before the data does — they need none of it, and
  // unmounting them would remount the range popover mid-transition.
  const controls = (
    <DashboardFilterRow
      filters={filters}
      currencyCode={data?.summary.totalSales.currencyCode ?? 'USD'}
    />
  );

  // First-load skeleton mirrors the loaded layout — pill row, 4-up metric grid,
  // chart card with its exact 280px reservation, then the two-column tail — so
  // content lands with zero layout shift (PARITY.md §Motion).
  if (isLoading) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageHeader icon={ChartVerticalIcon} title="Analytics" />
          {controls}
          <Grid>
            {(['sales', 'orders', 'sessions', 'aov'] as const).map((metric) => (
              <Grid.Cell key={metric} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                <Card>
                  <BlockStack gap="200">
                    <SkeletonBodyText lines={1} />
                    <SkeletonDisplayText size="small" />
                  </BlockStack>
                </Card>
              </Grid.Cell>
            ))}
          </Grid>
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <SkeletonBodyText lines={1} />
                    <SkeletonDisplayText size="small" />
                  </BlockStack>
                  {/* Matches SalesChart's fixed plot height so nothing jumps. */}
                  <div style={{ height: 280, width: '100%' }} />
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneThird">
              <Card>
                <SkeletonBodyText lines={7} />
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageHeader icon={ChartVerticalIcon} title="Analytics" />
          {controls}
          <Card>
            <Box padding="800">
              <BlockStack gap="200" inlineAlign="center">
                <Text as="h2" variant="headingMd">
                  Analytics are unavailable
                </Text>
                <Text as="p" tone="subdued" alignment="center">
                  {error?.message ?? 'We could not load this report. Try again in a moment.'}
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  const { summary, funnel } = data;
  const currencyCode = summary.totalSales.currencyCode;
  const comparison = filters.compare ? summary.comparison : null;
  const salesDelta = comparison
    ? deltaPercent(summary.totalSales.amount, comparison.totalSales.amount)
    : null;

  return (
    <Page>
      <BlockStack gap="400">
        <PageHeader icon={ChartVerticalIcon} title="Analytics" />
        {controls}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Total sales"
              help={METRIC_HELP.totalSales}
              value={format(summary.totalSales)}
              delta={salesDelta}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Orders"
              help={METRIC_HELP.orders}
              value={summary.orderCount.toLocaleString('en-US')}
              delta={comparison ? deltaPercent(summary.orderCount, comparison.orderCount) : null}
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Sessions"
              help={METRIC_HELP.sessions}
              value={summary.sessionCount.toLocaleString('en-US')}
              delta={
                comparison ? deltaPercent(summary.sessionCount, comparison.sessionCount) : null
              }
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Average order value"
              help={METRIC_HELP.averageOrderValue}
              value={format(summary.averageOrderValue)}
              delta={
                comparison
                  ? deltaPercent(
                      summary.averageOrderValue.amount,
                      averageOrderValueOf(comparison.totalSales.amount, comparison.orderCount),
                    )
                  : null
              }
            />
          </Grid.Cell>
        </Grid>

        <Layout>
          <Layout.Section>
            <SalesChart
              points={data.salesOverTime}
              comparisonPoints={filters.compare ? data.comparisonSalesOverTime : []}
              currencyCode={currencyCode}
              total={summary.totalSales.amount}
              delta={salesDelta}
              range={filters.selection.range}
              comparisonRange={filters.compare ? filters.comparison : null}
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <SalesBreakdownCard
                breakdown={data.salesBreakdown}
                comparison={filters.compare ? data.comparisonSalesBreakdown : null}
                slug={slug}
              />
              <Card>
                <BlockStack gap="400">
                  <MetricLabel
                    variant="headingSm"
                    help="Total sales split by the channel the order came through."
                  >
                    Total sales by sales channel
                  </MetricLabel>
                  {data.salesByChannel.length === 0 ||
                  data.salesByChannel.every((channel) => channel.revenue.amount === 0) ? (
                    <NoDataForRange />
                  ) : (
                    data.salesByChannel.map((channel) => (
                      <InlineStack key={channel.channel} align="space-between">
                        <Text as="span" variant="bodyMd">
                          {channel.channel}
                        </Text>
                        <Text as="span" variant="bodyMd" fontWeight="semibold" numeric>
                          {format(channel.revenue)}
                        </Text>
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4, xl: 4 }}>
            <TopProductsCard products={data.topProducts} />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4, xl: 4 }}>
            <FunnelCard funnel={funnel} conversionRate={summary.conversionRate} />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4, xl: 4 }}>
            <LiveCard />
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}
