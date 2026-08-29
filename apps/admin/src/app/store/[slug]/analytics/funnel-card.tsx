'use client';

/**
 * Conversion funnel: sessions → … → purchase, with the loss at each step.
 * Owner: WS-G.
 *
 * A bar per stage rather than a chart — Shopify's funnel card is a list, and a
 * five-point chart is harder to read than the numbers themselves.
 */
import { BlockStack, Box, Card, InlineStack, Text } from '@shopify/polaris';
import { NoDataForRange } from './dashboard-filters.tsx';
import { MetricLabel } from './metric-card.tsx';
import { formatPercent, funnelStages } from './range.ts';

export function FunnelCard({
  funnel,
  conversionRate,
}: {
  funnel: {
    sessions: number;
    productViews: number;
    addedToCart: number;
    reachedCheckout: number;
    purchased: number;
  };
  /** The card's headline number: sessions that ended in a purchase. */
  conversionRate: number;
}) {
  const stages = funnelStages(funnel);
  const widest = Math.max(...stages.map((s) => s.value), 1);
  // Five zero-length bars read as a broken chart, not as a quiet week — this is
  // the same per-card empty state every other dashboard card uses.
  const empty = stages.every((stage) => stage.value === 0);

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <MetricLabel
            variant="headingSm"
            help="The share of sessions that ended in a purchase, and where the rest dropped off."
          >
            Conversion funnel
          </MetricLabel>
          <Text as="p" variant="headingLg">
            {formatPercent(conversionRate)}
          </Text>
        </BlockStack>
        {empty ? (
          <NoDataForRange />
        ) : (
          <BlockStack gap="300">
            {stages.map((stage) => (
              <BlockStack key={stage.label} gap="100">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="span" variant="bodySm">
                    {stage.label}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                      {stage.value.toLocaleString('en-US')}
                    </Text>
                    {stage.dropoff !== null && stage.dropoff > 0 && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        −{stage.dropoff.toFixed(0)}%
                      </Text>
                    )}
                  </InlineStack>
                </InlineStack>
                <Box
                  background="bg-surface-secondary"
                  borderRadius="100"
                  minHeight="8px"
                  width="100%"
                >
                  <Box
                    background="bg-fill-brand"
                    borderRadius="100"
                    minHeight="8px"
                    width={`${Math.max(2, (stage.value / widest) * 100)}%`}
                  />
                </Box>
              </BlockStack>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
