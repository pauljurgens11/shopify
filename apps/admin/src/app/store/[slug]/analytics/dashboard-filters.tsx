'use client';

/**
 * The dashboard filter row (docs/parity/dashboard.md §Filter row). Owner: WS-G.
 *
 * Three pills, above the content and NOT inside a card: date range, the period
 * the deltas compare against, and the currency every figure is in. The
 * comparison pill is the detail people recognise — Shopify dashboards are
 * always current-vs-previous, and it is what justifies a delta on every tile.
 *
 * Currency is a single-option popover on purpose: presentment currency is out
 * of scope (SPEC §2), but the pill still tells the truth about what the numbers
 * are denominated in, which is the job it does on the real dashboard.
 */
import {
  ActionList,
  Box,
  Button,
  type IconSource,
  InlineStack,
  Popover,
  Text,
} from '@shopify/polaris';
import { CalendarIcon, CurrencyConvertIcon } from '@shopify/polaris-icons';
import { useMemo, useState } from 'react';
import { DateRangePicker, type DateRangeSelection } from './date-range-picker.tsx';
import {
  comparisonRangeFor,
  type DateRange,
  formatRangeLabel,
  queryStringFor,
  type RangePreset,
  rangeFor,
} from './range.ts';

export type DashboardFilters = {
  /** Pinned once so "today" cannot slide under the user mid-session. */
  now: Date;
  selection: DateRangeSelection;
  setSelection: (next: DateRangeSelection) => void;
  compare: boolean;
  setCompare: (on: boolean) => void;
  /** `from=…&to=…` for `/admin/api/analytics`. */
  query: string;
  /** The window the deltas are measured against — same length, immediately before. */
  comparison: DateRange;
};

export function useDashboardFilters(initialPreset: RangePreset): DashboardFilters {
  const now = useMemo(() => new Date(), []);
  const [selection, setSelection] = useState<DateRangeSelection>(() => ({
    preset: initialPreset,
    range: rangeFor(initialPreset, now),
  }));
  const [compare, setCompare] = useState(true);

  return {
    now,
    selection,
    setSelection,
    compare,
    setCompare,
    query: queryStringFor(selection.range),
    comparison: comparisonRangeFor(selection.range),
  };
}

function Pill({
  icon,
  label,
  items,
}: {
  icon: IconSource;
  label: string;
  items: { content: string; active: boolean; helpText?: string; onAction: () => void }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      preferredAlignment="left"
      activator={
        <Button
          icon={icon}
          disclosure={open ? 'up' : 'down'}
          onClick={() => setOpen((was) => !was)}
        >
          {label}
        </Button>
      }
    >
      <ActionList
        actionRole="menuitem"
        items={items.map((item) => ({
          content: item.content,
          helpText: item.helpText,
          active: item.active,
          onAction: () => {
            item.onAction();
            setOpen(false);
          },
        }))}
      />
    </Popover>
  );
}

export function DashboardFilterRow({
  filters,
  currencyCode,
}: {
  filters: DashboardFilters;
  currencyCode: string;
}) {
  const { now, selection, setSelection, compare, setCompare, comparison } = filters;

  return (
    <InlineStack gap="200" blockAlign="center">
      <DateRangePicker selection={selection} now={now} onChange={setSelection} />

      <Pill
        icon={CalendarIcon}
        label={compare ? formatRangeLabel(comparison) : 'No comparison'}
        items={[
          {
            content: 'Previous period',
            helpText: formatRangeLabel(comparison),
            active: compare,
            onAction: () => setCompare(true),
          },
          { content: 'No comparison', active: !compare, onAction: () => setCompare(false) },
        ]}
      />

      <Pill
        icon={CurrencyConvertIcon}
        label={currencyCode}
        items={[
          {
            content: currencyCode,
            helpText: 'Your store’s currency',
            active: true,
            onAction: () => undefined,
          },
        ]}
      />
    </InlineStack>
  );
}

/**
 * The per-card empty state a dashboard uses: the heading stays, the body
 * becomes one centred subdued line (docs/parity/dashboard.md §Per-card empty
 * state). No illustration, no button — those belong on an index page.
 */
export function NoDataForRange() {
  return (
    <Box paddingBlock="600">
      <Text as="p" tone="subdued" alignment="center">
        No data for this date range
      </Text>
    </Box>
  );
}
