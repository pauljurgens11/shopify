'use client';

/**
 * Home — the first screen after login, and the first screen of the demo
 * walkthrough (SPEC §8, §9). Owner: WS-G.
 *
 * Built from **docs/parity/dashboard.md**, not from `home.md`. Shopify serves
 * two Homes: an onboarding one for empty stores and a dashboard one for stores
 * with history. Aurora Supply Co. is seeded with products, orders and customers
 * (CLAUDE.md §8), so ours is the dashboard variant — the same chrome the parity
 * capture read off Analytics: filter pills above the content, four metric
 * tiles, a wide two-series chart beside a breakdown list, and
 * `No data for this date range` inside any card that has none.
 *
 * It is deliberately shorter than /analytics: Home shows the top line and the
 * setup guide, Analytics is the full report.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import {
  Banner,
  BlockStack,
  Card,
  Grid,
  Layout,
  Page,
  SkeletonBodyText,
  SkeletonDisplayText,
} from '@shopify/polaris';
import { PageSkeleton } from '../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../lib/api.ts';
import { useSession } from '../../../lib/session.ts';
import { SalesBreakdownCard } from './analytics/breakdown-card.tsx';
import { DashboardFilterRow, useDashboardFilters } from './analytics/dashboard-filters.tsx';
import { METRIC_HELP, MetricCard } from './analytics/metric-card.tsx';
import { averageOrderValueOf, deltaPercent } from './analytics/range.ts';
import { SalesChart } from './analytics/sales-chart.tsx';
import { OnboardingCard } from './onboarding-card.tsx';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { data: session } = useSession();
  // Last 30 days, not Today: the seed deliberately ends its history at the end
  // of YESTERDAY (DECISIONS, WS-H), so a Today default guarantees that the first
  // screen of the demo is an empty dashboard. The parity capture pinned no
  // default for Home — its `Today` pill was the state of that capture session.
  const filters = useDashboardFilters('30d');

  const {
    data: dashboard,
    error,
    refetch,
  } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', filters.query],
    `/admin/api/analytics?${filters.query}`,
    { enabled: Boolean(session), keepPreviousData: true },
  );

  if (!session) return <PageSkeleton />;

  const summary = dashboard?.summary;
  const currencyCode = summary?.totalSales.currencyCode ?? session.shop.currencyCode ?? 'USD';
  // A failed report must not skeleton forever: the banner below explains it,
  // and the cards fall back rather than pretending they are still on the way.
  const pending = !dashboard && !error;
  const comparison = filters.compare ? (summary?.comparison ?? null) : null;
  const salesDelta =
    summary && comparison
      ? deltaPercent(summary.totalSales.amount, comparison.totalSales.amount)
      : null;

  return (
    <Page title={`${greeting(new Date().getHours())}, ${session.shop.name}`}>
      <BlockStack gap="400">
        <OnboardingCard slug={session.shop.slug} />

        {/* $0.00 with no explanation is a wrong number, not a fallback — the
            first screen after login must not present a failed report as data. */}
        {error ? (
          <Banner
            tone="critical"
            title="Your numbers could not be loaded"
            action={{ content: 'Try again', onAction: () => refetch() }}
          >
            <p>{error.message}</p>
          </Banner>
        ) : null}

        <DashboardFilterRow filters={filters} currencyCode={currencyCode} />

        {pending ? (
          <BlockStack gap="400">
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
        ) : null}

        {dashboard && summary ? (
          <BlockStack gap="400">
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
                  delta={
                    comparison ? deltaPercent(summary.orderCount, comparison.orderCount) : null
                  }
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
                  points={dashboard.salesOverTime}
                  comparisonPoints={filters.compare ? dashboard.comparisonSalesOverTime : []}
                  currencyCode={currencyCode}
                  total={summary.totalSales.amount}
                  delta={salesDelta}
                  range={filters.selection.range}
                  comparisonRange={filters.compare ? filters.comparison : null}
                />
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <SalesBreakdownCard
                  breakdown={dashboard.salesBreakdown}
                  comparison={filters.compare ? dashboard.comparisonSalesBreakdown : null}
                  slug={session.shop.slug}
                />
              </Layout.Section>
            </Layout>
          </BlockStack>
        ) : null}
      </BlockStack>
    </Page>
  );
}
