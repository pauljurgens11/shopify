'use client';

/**
 * The hero chart: sales over the selected range (PARITY.md §Home & Analytics).
 * Owner: WS-G.
 *
 * Recharts, not polaris-viz — see DECISIONS.md. Colours come from Polaris
 * `--p-*` tokens so it still reads as Shopify's chart rather than a generic one.
 *
 * The series arrives in MAJOR units from `chartSeries` and the axis/tooltip put
 * the currency back on: the landmine here is an axis reading 129,900 for a
 * $1,299.00 day.
 */
import { format } from '@merchant/config/money';
import { BlockStack, Card, Text } from '@shopify/polaris';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisLabel, chartSeries, toChartValue } from './range.ts';

export function SalesChart({
  points,
  currencyCode,
  total,
}: {
  points: { bucket: string; value: number }[];
  currencyCode: string;
  total: number;
}) {
  const data = chartSeries(points, currencyCode).map((point) => ({
    ...point,
    label: axisLabel(point.key),
  }));

  /** Chart values are major units; `format` wants minor, so scale back. */
  const asMoney = (value: number) =>
    format({ amount: Math.round(value / toChartValue(1, currencyCode)), currencyCode });

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h3" variant="bodySm" tone="subdued">
            Total sales
          </Text>
          <Text as="p" variant="headingLg">
            {format({ amount: total, currencyCode })}
          </Text>
        </BlockStack>
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--p-color-bg-fill-brand)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--p-color-bg-fill-brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={asMoney}
                tick={{ fill: 'var(--p-color-text-secondary)', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [asMoney(Number(value)), 'Total sales']}
                contentStyle={{
                  background: 'var(--p-color-bg-surface)',
                  border: '1px solid var(--p-color-border)',
                  borderRadius: 'var(--p-border-radius-200)',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--p-color-bg-fill-brand)"
                strokeWidth={2}
                fill="url(#salesFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}
