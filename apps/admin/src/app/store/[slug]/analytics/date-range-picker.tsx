'use client';

/**
 * The dashboard's date-range control (docs/parity/dashboard.md §The date-range
 * popover). Owner: WS-G.
 *
 * Shopify's is a pill that opens a wide popover split into a preset rail and a
 * two-month calendar, with `Cancel` / `Apply` and Apply disabled until the
 * selection actually changes. It is the first control a merchant touches on a
 * dashboard, so it is built rather than approximated with an ActionList.
 *
 * Two things it must not get wrong:
 *
 * 1. **Nothing commits until Apply.** Every edit lands in a draft; Cancel drops
 *    it. A range control that refetches on every calendar click fires four
 *    requests to pick one week.
 * 2. **The calendar is local-time, our ranges are UTC days.** Polaris's
 *    `DatePicker` builds `Date`s at local midnight; the API buckets by UTC day.
 *    Everything crossing that boundary goes through `toLocalDay`/`toUtcDay`, or
 *    a merchant west of UTC picks the 29th and gets the 28th.
 */
import {
  BlockStack,
  Box,
  Button,
  DatePicker,
  Icon,
  InlineStack,
  Popover,
  TextField,
} from '@shopify/polaris';
import { ArrowRightIcon, CalendarIcon } from '@shopify/polaris-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  type DateRange,
  formatDay,
  formatRangeLabel,
  PRESET_GROUPS,
  parseDayInput,
  presetForRange,
  presetLabel,
  type RangePreset,
  rangeFor,
  startOfUtcDay,
} from './range.ts';

/** UTC day start → the local-midnight `Date` Polaris's calendar works in. */
function toLocalDay(day: Date): Date {
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}

/** …and back. */
function toUtcDay(day: Date): Date {
  return new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
}

const sameRange = (a: DateRange, b: DateRange) =>
  startOfUtcDay(a.from).getTime() === startOfUtcDay(b.from).getTime() &&
  startOfUtcDay(a.to).getTime() === startOfUtcDay(b.to).getTime();

export type DateRangeSelection = { preset: RangePreset; range: DateRange };

export function DateRangePicker({
  selection,
  now,
  onChange,
}: {
  selection: DateRangeSelection;
  /** Pinned by the page so "today" cannot move mid-session. */
  now: Date;
  onChange: (next: DateRangeSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeSelection>(selection);
  // The left month of the two-month view; the right one is the month after.
  const [{ month, year }, setMonth] = useState(() => {
    const anchor = selection.range.to;
    return { month: anchor.getUTCMonth(), year: anchor.getUTCFullYear() };
  });
  const [fromText, setFromText] = useState(() => formatDay(selection.range.from));
  const [toText, setToText] = useState(() => formatDay(selection.range.to));

  /** Every draft edit funnels through here so the two text fields never drift. */
  const applyDraft = useCallback((next: DateRangeSelection) => {
    setDraft(next);
    setFromText(formatDay(next.range.from));
    setToText(formatDay(next.range.to));
  }, []);

  const anchorMonth = useCallback((range: DateRange) => {
    // Shopify anchors the pair so the range's END is the RIGHT-hand month —
    // "July and August" on August 29 — which keeps the selection in view.
    const end = range.to;
    const left = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    setMonth({ month: left.getUTCMonth(), year: left.getUTCFullYear() });
  }, []);

  // Reopening always starts from what is committed, never from an abandoned draft.
  useEffect(() => {
    if (!open) return;
    applyDraft(selection);
    anchorMonth(selection.range);
  }, [open, selection, applyDraft, anchorMonth]);

  const dirty = draft.preset !== selection.preset || !sameRange(draft.range, selection.range);

  function choosePreset(preset: RangePreset) {
    // `Custom range` has no window of its own — it just parks the rail on the
    // calendar's current selection.
    const range = preset === 'custom' ? draft.range : rangeFor(preset, now);
    applyDraft({ preset, range });
    anchorMonth(range);
  }

  function chooseDays(next: { start: Date; end: Date }) {
    const range = { from: toUtcDay(next.start), to: toUtcDay(next.end) };
    applyDraft({ preset: presetForRange(range, now), range });
  }

  /** Commit a typed date, or snap the field back to what the draft still says. */
  function commitText(edge: 'from' | 'to', text: string) {
    const parsed = parseDayInput(text);
    const today = startOfUtcDay(now);
    if (!parsed || parsed > today) {
      applyDraft(draft);
      return;
    }
    // Typing an end before the start (or a start after the end) reads as
    // "I meant this one day", which is what Shopify does too.
    const from = edge === 'from' ? parsed : draft.range.from;
    const to = edge === 'to' ? parsed : draft.range.to;
    const range = from > to ? { from: parsed, to: parsed } : { from, to };
    applyDraft({ preset: presetForRange(range, now), range });
    anchorMonth(range);
  }

  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      preferredAlignment="left"
      autofocusTarget="none"
      // Without this the overlay is capped at 400×500 and the two months stack
      // vertically (Polaris gives each month a 230px min-width), which turns the
      // whole panel into a cut-off single column.
      fluidContent
      activator={
        <Button
          icon={CalendarIcon}
          disclosure={open ? 'up' : 'down'}
          onClick={() => setOpen((was) => !was)}
        >
          {selection.preset === 'custom'
            ? formatRangeLabel(selection.range)
            : presetLabel(selection.preset)}
        </Button>
      }
    >
      {/* ~870px, per the parity capture. Fixed rather than content-sized: with
          `fluidContent` the two months are `flex: 1 1 230px` with no upper
          bound, so an unconstrained panel stretches them across the viewport. */}
      <div style={{ display: 'flex', width: 868, maxWidth: 'calc(100vw - 3rem)' }}>
        <Box
          borderColor="border-secondary"
          borderInlineEndWidth="025"
          padding="200"
          minWidth="190px"
        >
          <BlockStack gap="100">
            {PRESET_GROUPS.map((group, index) => (
              <BlockStack gap="050" key={group.join()}>
                {index > 0 && (
                  <Box paddingBlock="100">
                    <Box borderColor="border-secondary" borderBlockStartWidth="025" />
                  </Box>
                )}
                {group.map((preset) => (
                  <Button
                    key={preset}
                    variant="tertiary"
                    fullWidth
                    textAlign="left"
                    pressed={draft.preset === preset}
                    onClick={() => choosePreset(preset)}
                  >
                    {presetLabel(preset)}
                  </Button>
                ))}
              </BlockStack>
            ))}
          </BlockStack>
        </Box>

        {/* Takes the rest of the 868px. Polaris' months are `min-width: 230px`
            each, so they sit side by side here and wrap only once the viewport
            forces the panel narrower. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Box padding="400">
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center" align="start" wrap={false}>
                <div style={{ width: 190, flexShrink: 0 }}>
                  <TextField
                    label="Starting"
                    labelHidden
                    autoComplete="off"
                    value={fromText}
                    onChange={setFromText}
                    onBlur={() => commitText('from', fromText)}
                  />
                </div>
                {/* Boxed: Polaris' Icon carries `margin: auto`, and an auto margin
                  on a flex child eats the row's free space — unwrapped, the two
                  fields get shoved to opposite ends of the panel. */}
                <Box>
                  <Icon source={ArrowRightIcon} tone="subdued" />
                </Box>
                <div style={{ width: 190, flexShrink: 0 }}>
                  <TextField
                    label="Ending"
                    labelHidden
                    autoComplete="off"
                    value={toText}
                    onChange={setToText}
                    onBlur={() => commitText('to', toText)}
                  />
                </div>
              </InlineStack>

              <DatePicker
                month={month}
                year={year}
                multiMonth
                allowRange
                disableDatesAfter={toLocalDay(startOfUtcDay(now))}
                selected={{
                  start: toLocalDay(draft.range.from),
                  end: toLocalDay(draft.range.to),
                }}
                onMonthChange={(nextMonth, nextYear) =>
                  setMonth({ month: nextMonth, year: nextYear })
                }
                onChange={chooseDays}
              />

              <InlineStack align="end" gap="200">
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  disabled={!dirty}
                  onClick={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                >
                  Apply
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </div>
      </div>
    </Popover>
  );
}
