'use client';

/**
 * `Total sales over time` — the dashboard's hero chart
 * (docs/parity/dashboard.md §Chart cards). Owner: WS-G.
 *
 * Recharts, not polaris-viz — see DECISIONS.md. Colours come from Polaris
 * `--p-*` tokens so it still reads as Shopify's chart rather than a generic one.
 *
 * The shape that makes it read as Shopify: dotted-underlined heading, the
 * headline figure repeated large underneath with its delta, **two** series —
 * the selected period solid and the comparison period dashed in a lighter tint
 * of the same hue — light horizontal gridlines only, and a centred dot legend
 * below the plot naming both periods.
 *
 * The series arrives in MAJOR units from `chartSeries` and the axis/tooltip put
 * the currency back on: the landmine here is an axis reading 129,900 for a
 * $1,299.00 day.
 */
import { format } from '@merchant/config/money';
import { BlockStack, Box, Card, InlineStack, Text } from '@shopify/polaris';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { NoDataForRange } from './dashboard-filters.tsx';
import { DeltaIndicator, MetricLabel } from './metric-card.tsx';
import {
  axisLabel,
  axisMoney,
  chartSeries,
  type DateRange,
  formatRangeLabel,
  toChartValue,
} from './range.ts';

const CURRENT_COLOR = 'var(--p-color-bg-fill-brand)';
// A lighter tint of the SAME hue, as the parity capture describes. Polaris'
// `*-brand-selected` is the same value as `*-brand` in the light theme, so the
// tint has to come from the neutral icon ramp instead — rgba(138,138,138)
// against rgba(48,48,48). No hard-coded hex: CLAUDE.md §7 allows `--p-*` only.
const COMPARISON_COLOR = 'var(--p-color-icon-secondary)';

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <InlineStack gap="150" blockAlign="center" wrap={false}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
    </InlineStack>
  );
}

type Row = {
  label: string;
  comparisonLabel: string | null;
  current: number;
  comparison: number | null;
};

function ChartTooltip({
  active,
  payload,
  asMoney,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  asMoney: (value: number) => string;
}) {
  const row = active ? payload?.[0]?.payload : undefined;
  if (!row) return null;

  return (
    <Box
      background="bg-surface"
      borderColor="border"
      borderWidth="025"
      borderRadius="200"
      padding="200"
      shadow="200"
    >
      <BlockStack gap="100">
        <InlineStack gap="400" align="space-between" wrap={false}>
          <LegendDot color={CURRENT_COLOR} label={row.label} />
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {asMoney(row.current)}
          </Text>
        </InlineStack>
        {row.comparisonLabel !== null && row.comparison !== null && (
          <InlineStack gap="400" align="space-between" wrap={false}>
            <LegendDot color={COMPARISON_COLOR} label={row.comparisonLabel} />
            <Text as="span" variant="bodySm" tone="subdued">
              {asMoney(row.comparison)}
            </Text>
          </InlineStack>
        )}
      </BlockStack>
    </Box>
  );
}

export function SalesChart({
  points,
  comparisonPoints,
  currencyCode,
  total,
  delta,
  range,
  comparisonRange,
}: {
  points: { bucket: string; value: number }[];
  /** Aligned to `points` BY INDEX, or empty when comparison is off. */
  comparisonPoints: { bucket: string; value: number }[];
  currencyCode: string;
  total: number;
  delta: number | null;
  range: DateRange;
  comparisonRange: DateRange | null;
}) {
  const current = chartSeries(points, currencyCode);
  const previous = chartSeries(comparisonPoints, currencyCode);

  const data: Row[] = current.map((point, index) => {
    const paired = previous[index];
    return {
      label: axisLabel(point.key),
      comparisonLabel: paired ? axisLabel(paired.key) : null,
      current: point.value,
      comparison: paired ? paired.value : null,
    };
  });

  const hasComparison = comparisonRange !== null && previous.length > 0;
  /** Chart values are major units; `format` wants minor, so scale back. */
  const asMoney = (value: number) =>
    format({ amount: Math.round(value / toChartValue(1, currencyCode)), currencyCode });

  const empty =
    data.length === 0 || data.every((row) => row.current === 0 && (row.comparison ?? 0) === 0);

  // A one-bucket range (Today, Yesterday) is a single point per series, and a
  // line through one point draws NOTHING — the card would look broken while
  // holding real numbers. Show the marks whenever there is no segment to draw.
  const showDots = data.length < 2;

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <MetricLabel
            variant="headingSm"
            help="Gross sales minus discounts, plus shipping and tax, for each day in the selected period."
          >
            Total sales over time
          </MetricLabel>
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Text as="p" variant="headingLg">
              {format({ amount: total, currencyCode })}
            </Text>
            <DeltaIndicator delta={delta} />
          </InlineStack>
        </BlockStack>

        {empty ? (
          <NoDataForRange />
        ) : (
          <BlockStack gap="300">
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--p-color-border-secondary)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{ fill: 'var(--p-color-text-secondary)', fontSize: 12 }}
                  />
                  <YAxis
                    width={72}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => axisMoney(value, currencyCode)}
                    tick={{ fill: 'var(--p-color-text-secondary)', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--p-color-border)', strokeWidth: 1 }}
                    content={<ChartTooltip asMoney={asMoney} />}
                  />
                  {hasComparison && (
                    <Line
                      type="monotone"
                      dataKey="comparison"
                      stroke={COMPARISON_COLOR}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={showDots ? { r: 3, fill: COMPARISON_COLOR } : false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke={CURRENT_COLOR}
                    strokeWidth={2}
                    dot={showDots ? { r: 3, fill: CURRENT_COLOR } : false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <InlineStack gap="500" align="center" blockAlign="center">
              <LegendDot color={CURRENT_COLOR} label={formatRangeLabel(range)} />
              {hasComparison && comparisonRange && (
                <LegendDot color={COMPARISON_COLOR} label={formatRangeLabel(comparisonRange)} />
              )}
            </InlineStack>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
