'use client';

/**
 * One dashboard metric tile (docs/parity/dashboard.md §Metric tiles). Owner: WS-G.
 *
 * Label on top — small, dark, dotted-underlined because it is a tooltip
 * trigger — then the value large and semibold on the next line, then the delta
 * right after it. Four of these across, each its own card, no heading above
 * the row.
 *
 * The delta renders `—` rather than disappearing when there is nothing to
 * compare against: an absent chip makes the tile look like a different
 * component from the one beside it, and Shopify keeps the slot occupied.
 */
import { BlockStack, Box, Card, Icon, InlineStack, Text, Tooltip } from '@shopify/polaris';
import { ArrowDownIcon, ArrowUpIcon } from '@shopify/polaris-icons';
import { formatDelta } from './range.ts';

/**
 * What each tile's dotted underline promises. Lives here rather than on a page
 * so Home and Analytics cannot drift into describing the same metric two ways.
 */
export const METRIC_HELP = {
  totalSales: 'Gross sales minus discounts, plus shipping and tax.',
  orders: 'Orders placed in this period. Cancelled orders are excluded.',
  sessions: 'Visits to your online store in this period.',
  averageOrderValue: 'Total sales divided by the number of orders.',
} as const;

/**
 * A tooltip-triggering label with Shopify's dotted underline. Used for both the
 * metric-tile labels and the chart-card headings, which carry the same
 * affordance on the real dashboard.
 */
export function MetricLabel({
  children,
  help,
  variant = 'bodySm',
}: {
  children: string;
  /** Omit only where there is genuinely nothing to explain: no help, no dotted
   *  underline, because the underline is a promise that a tooltip follows. */
  help?: string;
  variant?: 'bodySm' | 'headingSm';
}) {
  const label = (
    <Text as="span" variant={variant} fontWeight={variant === 'headingSm' ? 'semibold' : undefined}>
      {children}
    </Text>
  );

  if (!help) return label;

  return (
    <Tooltip content={help} preferredPosition="above">
      <span
        style={{
          textDecoration: 'underline dotted',
          textDecorationColor: 'var(--p-color-border)',
          textUnderlineOffset: '3px',
          cursor: 'help',
        }}
      >
        {label}
      </span>
    </Tooltip>
  );
}

/** The `▲ 12.3%` / `▼ 8.4%` / `—` indicator that follows every dashboard figure. */
export function DeltaIndicator({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <Text as="span" variant="bodySm" tone="subdued">
        —
      </Text>
    );
  }
  if (delta === 0) {
    return (
      <Text as="span" variant="bodySm" tone="subdued">
        {formatDelta(0)}
      </Text>
    );
  }

  const up = delta > 0;
  return (
    <InlineStack gap="050" blockAlign="center" wrap={false}>
      <Box>
        <Icon source={up ? ArrowUpIcon : ArrowDownIcon} tone={up ? 'success' : 'critical'} />
      </Box>
      <Text as="span" variant="bodySm" tone={up ? 'success' : 'critical'}>
        {formatDelta(delta)}
      </Text>
    </InlineStack>
  );
}

export function MetricCard({
  label,
  help,
  value,
  delta,
}: {
  label: string;
  /** What the metric counts — the tooltip the dotted underline promises. */
  help?: string;
  value: string;
  delta: number | null;
}) {
  return (
    <Card>
      <BlockStack gap="100">
        <MetricLabel help={help}>{label}</MetricLabel>
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Text as="p" variant="headingLg">
            {value}
          </Text>
          <DeltaIndicator delta={delta} />
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
