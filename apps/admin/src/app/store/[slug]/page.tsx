'use client';

/**
 * Home — the first screen after login, and the first screen of the demo
 * walkthrough (SPEC §8, §9; PARITY.md §Home & Analytics). Owner: WS-G.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import { BlockStack, Card, Grid, InlineStack, Page, Text } from '@shopify/polaris';
import { useMemo } from 'react';
import { useApiQuery } from '../../../lib/api.ts';
import { useSession } from '../../../lib/session.ts';
import { rangeQueryString } from './analytics/range.ts';
import { OnboardingCard } from './onboarding-card.tsx';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function TodayMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="headingLg">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const today = useMemo(() => rangeQueryString('today', new Date()), []);

  const { data: dashboard } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', 'today'],
    `/admin/api/analytics?${today}`,
    { enabled: Boolean(session) },
  );

  if (!session) return null;

  const summary = dashboard?.summary;
  const currencyCode = summary?.totalSales.currencyCode ?? 'USD';

  return (
    <Page title={`${greeting(new Date().getHours())}, ${session.shop.name}`}>
      <BlockStack gap="400">
        <OnboardingCard slug={session.shop.slug} />

        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Today
            </Text>
          </InlineStack>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <TodayMetric
                label="Total sales"
                value={format(summary?.totalSales ?? { amount: 0, currencyCode })}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <TodayMetric
                label="Orders"
                value={(summary?.orderCount ?? 0).toLocaleString('en-US')}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <TodayMetric
                label="Sessions"
                value={(summary?.sessionCount ?? 0).toLocaleString('en-US')}
              />
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
