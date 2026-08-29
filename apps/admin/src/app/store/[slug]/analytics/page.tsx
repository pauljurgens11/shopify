'use client';

/**
 * Analytics dashboard (SPEC §9, §13; PARITY.md §Home & Analytics). Owner: WS-G.
 *
 * One request feeds every card — G2 returns the whole dashboard in a single
 * `analyticsDashboardResponse`, so the page has one loading state rather than
 * six racing spinners. `Live view` is the exception: it polls on its own.
 *
 * The controls sit at the TOP LEFT of the content, not in the page header:
 * Shopify's analytics puts the range button and the compare toggle above the
 * cards they filter, and a range control in `primaryAction` reads as a save
 * button (PARITY.md).
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import {
  ActionList,
  BlockStack,
  Box,
  Button,
  Card,
  Grid,
  InlineStack,
  Layout,
  Page,
  Popover,
  SkeletonBodyText,
  SkeletonDisplayText,
  Text,
} from '@shopify/polaris';
import { CalendarIcon } from '@shopify/polaris-icons';
import { useMemo, useState } from 'react';
import { useApiQuery } from '../../../../lib/api.ts';
import { FunnelCard } from './funnel-card.tsx';
import { LiveCard } from './live-card.tsx';
import { MetricCard } from './metric-card.tsx';
import {
  averageOrderValueOf,
  deltaPercent,
  RANGE_OPTIONS,
  type RangePreset,
  rangeQueryString,
} from './range.ts';
import { SalesChart } from './sales-chart.tsx';
import { TopProductsCard } from './top-products-card.tsx';

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [compare, setCompare] = useState(true);

  // Pinned per preset so the range does not slide under the user mid-session,
  // and so the query key stays stable across re-renders.
  const query = useMemo(() => rangeQueryString(preset, new Date()), [preset]);

  // keepPreviousData: switching the range keeps the previous period's cards on
  // screen while the new one loads, instead of flashing back to the skeleton.
  const { data, isLoading, error } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', preset],
    `/admin/api/analytics?${query}`,
    { keepPreviousData: true },
  );

  const rangeLabel = RANGE_OPTIONS.find((option) => option.value === preset)?.label ?? 'Today';

  const controls = (
    <InlineStack gap="200" blockAlign="center">
      <Popover
        active={rangeOpen}
        onClose={() => setRangeOpen(false)}
        preferredAlignment="left"
        activator={
          <Button icon={CalendarIcon} disclosure onClick={() => setRangeOpen((open) => !open)}>
            {rangeLabel}
          </Button>
        }
      >
        <ActionList
          actionRole="menuitem"
          items={RANGE_OPTIONS.map((option) => ({
            content: option.label,
            active: option.value === preset,
            onAction: () => {
              setPreset(option.value);
              setRangeOpen(false);
            },
          }))}
        />
      </Popover>
      <Button pressed={compare} onClick={() => setCompare((on) => !on)}>
        Compare to previous period
      </Button>
    </InlineStack>
  );

  // First-load skeleton mirrors the loaded layout — controls row, 4-up metric
  // grid, chart card with its exact 280px reservation, then the two-column
  // tail — so content lands with zero layout shift (PARITY.md §Motion). The
  // real controls render immediately: they need no data, and unmounting them
  // would remount the range Popover mid-transition.
  if (isLoading) {
    return (
      <Page title="Analytics">
        <BlockStack gap="400">
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
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <SkeletonBodyText lines={6} />
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <Card>
                <SkeletonBodyText lines={6} />
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page title="Analytics">
        <BlockStack gap="400">
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
  const comparison = compare ? summary.comparison : null;

  return (
    <Page title="Analytics">
      <BlockStack gap="400">
        {controls}

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
              label="Sessions"
              value={summary.sessionCount.toLocaleString('en-US')}
              delta={
                comparison ? deltaPercent(summary.sessionCount, comparison.sessionCount) : null
              }
            />
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
            <MetricCard
              label="Average order value"
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
                  {data.salesByChannel.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No sales in this period yet.
                    </Text>
                  ) : (
                    data.salesByChannel.map((channel) => (
                      <InlineStack key={channel.channel} align="space-between">
                        <Text as="span" variant="bodyMd">
                          {channel.channel}
                        </Text>
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {format(channel.revenue)}
                        </Text>
                      </InlineStack>
                    ))
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <BlockStack gap="400">
              <FunnelCard funnel={funnel} conversionRate={summary.conversionRate} />
              <LiveCard />
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
