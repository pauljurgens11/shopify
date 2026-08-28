'use client';

/**
 * "Right now" — visitors in the last 30 minutes and orders so far today.
 * Polls every 30s (SPEC §13: polling, no websockets). Owner: WS-G.
 */
import { BlockStack, Card, InlineStack, Text } from '@shopify/polaris';
import { useApiQuery } from '../../../../lib/api.ts';

type LiveView = { visitors: number; ordersToday: number };

export function LiveCard() {
  const { data } = useApiQuery<LiveView>(['analytics', 'live'], '/admin/api/analytics/live', {
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Live view
        </Text>
        <InlineStack gap="800">
          <BlockStack gap="100">
            <Text as="span" variant="headingLg">
              {data?.visitors ?? '—'}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              Visitors right now
            </Text>
          </BlockStack>
          <BlockStack gap="100">
            <Text as="span" variant="headingLg">
              {data?.ordersToday ?? '—'}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              Orders today
            </Text>
          </BlockStack>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
