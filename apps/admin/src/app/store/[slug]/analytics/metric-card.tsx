'use client';

/**
 * One dashboard metric: small label, big number, delta chip (PARITY.md §Home &
 * Analytics). Owner: WS-G.
 *
 * The chip is hidden rather than zeroed when there is nothing to compare
 * against — see `deltaPercent`.
 */
import { BlockStack, Box, Card, Icon, InlineStack, Text } from '@shopify/polaris';
import { ArrowDownIcon, ArrowUpIcon } from '@shopify/polaris-icons';
import { formatDelta } from './range.ts';

export function MetricCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: number | null;
}) {
  const up = (delta ?? 0) >= 0;

  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <InlineStack gap="200" blockAlign="center">
          <Text as="p" variant="headingLg">
            {value}
          </Text>
          {delta !== null && delta !== 0 && (
            <InlineStack gap="050" blockAlign="center">
              <Box>
                <Icon
                  source={up ? ArrowUpIcon : ArrowDownIcon}
                  tone={up ? 'success' : 'critical'}
                />
              </Box>
              <Text as="span" variant="bodySm" tone={up ? 'success' : 'critical'}>
                {formatDelta(delta)}
              </Text>
            </InlineStack>
          )}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
