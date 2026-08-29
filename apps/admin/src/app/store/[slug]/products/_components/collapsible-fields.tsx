'use client';

/**
 * The collapsed-pill pattern from the Price, Inventory and Shipping cards
 * (docs/parity/product-form.md — "Compare-at", "SKU", "Sell when out of stock"
 * … then a `⌄` chevron). Owner: WS-B (B5).
 *
 * This is what makes those cards read as current Shopify rather than as three
 * generic forms: the rare fields are one row of small buttons until you need
 * them, and a field that ALREADY carries a value opens expanded, so nothing a
 * merchant has set is hidden behind a click.
 */
import { Button, InlineGrid, InlineStack } from '@shopify/polaris';
import { ChevronDownIcon } from '@shopify/polaris-icons';
import { type ReactNode, useState } from 'react';

export type PillField = {
  /** Stable across renders — it keys both the pill and the expanded state. */
  id: string;
  label: string;
  /** The current value, shown subdued on the pill: `Charge tax  Yes`. */
  value?: string;
  /** Set when the field already holds something, so it starts open. */
  filled?: boolean;
  field: ReactNode;
};

export function CollapsibleFields({ fields }: { fields: PillField[] }) {
  // Seeded once: re-deriving it per render would slam a field shut the moment
  // the merchant cleared it while typing.
  const [opened, setOpened] = useState<string[]>(() =>
    fields.filter((field) => field.filled).map((field) => field.id),
  );

  const isOpen = (field: PillField) => opened.includes(field.id);
  const expanded = fields.filter(isOpen);
  const collapsed = fields.filter((field) => !isOpen(field));

  return (
    <>
      {expanded.length > 0 ? (
        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
          {expanded.map((field) => (
            <div key={field.id}>{field.field}</div>
          ))}
        </InlineGrid>
      ) : null}

      {collapsed.length > 0 ? (
        <InlineStack gap="200" wrap>
          {collapsed.map((field) => (
            // Hand-built: Polaris `Button` only takes string children, and the
            // current value has to read subdued next to its label to look like
            // Shopify's pill (CLAUDE.md §7 escape hatch, `--p-*` tokens only).
            <button
              key={field.id}
              type="button"
              onClick={() => setOpened((current) => [...current, field.id])}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--p-space-150)',
                padding: 'var(--p-space-100) var(--p-space-300)',
                borderRadius: 'var(--p-border-radius-200)',
                border: 'var(--p-border-width-025) solid var(--p-color-border)',
                background: 'var(--p-color-bg-surface)',
                color: 'var(--p-color-text)',
                font: 'inherit',
                fontSize: 'var(--p-font-size-325)',
                lineHeight: 'var(--p-font-line-height-400)',
                cursor: 'pointer',
              }}
            >
              {field.label}
              {field.value === undefined ? null : (
                <span style={{ color: 'var(--p-color-text-secondary)' }}>{field.value}</span>
              )}
            </button>
          ))}
          <Button
            size="slim"
            icon={ChevronDownIcon}
            accessibilityLabel="Show all fields"
            onClick={() => setOpened(fields.map((field) => field.id))}
          />
        </InlineStack>
      ) : null}
    </>
  );
}
