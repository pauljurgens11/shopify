'use client';

/**
 * Home — the first screen after login, and the first screen of the demo
 * walkthrough (SPEC §8, §9; PARITY.md §Home & Analytics). Owner: WS-G.
 */
import { format } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import {
  BlockStack,
  Card,
  Grid,
  InlineStack,
  Page,
  SkeletonDisplayText,
  Text,
} from '@shopify/polaris';
import { useMemo } from 'react';
import { PageSkeleton } from '../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../lib/api.ts';
import { useSession } from '../../../lib/session.ts';
import { rangeQueryString } from './analytics/range.ts';
import { OnboardingCard } from './onboarding-card.tsx';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function TodayMetric({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="bodySm" tone="subdued">
          {label}
        </Text>
        {/* A metric that reads $0.00 while it loads is a wrong number, not a
            loading state — PARITY.md: skeleton, never a spinner or a stand-in. */}
        {loading ? (
          <SkeletonDisplayText size="medium" />
        ) : (
          <Text as="p" variant="headingLg">
            {value}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const today = useMemo(() => rangeQueryString('today', new Date()), []);

  const { data: dashboard, error } = useApiQuery<AnalyticsDashboard>(
    ['analytics', 'dashboard', 'today'],
    `/admin/api/analytics?${today}`,
    { enabled: Boolean(session) },
  );

  if (!session) return <PageSkeleton />;

  const summary = dashboard?.summary;
  const currencyCode = summary?.totalSales.currencyCode ?? 'USD';
  // A failed report must not skeleton forever: the cards fall back to their
  // zero values rather than pretending they are still on the way.
  const pending = !summary && !error;

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
                loading={pending}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <TodayMetric
                label="Orders"
                value={(summary?.orderCount ?? 0).toLocaleString('en-US')}
                loading={pending}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 4, xl: 4 }}>
              <TodayMetric
                label="Sessions"
                value={(summary?.sessionCount ?? 0).toLocaleString('en-US')}
                loading={pending}
              />
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
