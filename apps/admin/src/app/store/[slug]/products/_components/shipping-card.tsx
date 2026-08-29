'use client';

/**
 * The Shipping card (docs/parity/product-form.md → left column card 6).
 * Owner: WS-B (B5). Rendered only while the product has no options.
 *
 * `Physical product` is `requiresShipping`, which the checkout already reads to
 * decide whether an order needs a shipping address and a rate — turning it off
 * hides the weight because a digital product has none, exactly as Shopify does.
 *
 * `Package` (a per-product box) and the `Country of origin` / `HS code` pills
 * are absent: customs and packaging are out of scope (SPEC §2) and neither has
 * a column to save into.
 */
import { BlockStack, Card, InlineStack, Select, Text, TextField } from '@shopify/polaris';
import type { VariantDraft, WeightUnit } from '../../../../../lib/product-draft.ts';
import { Switch } from './switch.tsx';

const UNITS: { label: string; value: WeightUnit }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'g', value: 'g' },
  { label: 'lb', value: 'lb' },
  { label: 'oz', value: 'oz' },
];

/** Digits and at most one dot — a weight is typed, not spun. */
const WEIGHT_PATTERN = /^\d*(?:\.\d*)?$/;

export function ShippingCard({
  variant,
  onChange,
}: {
  variant: VariantDraft;
  onChange: (patch: Partial<VariantDraft>) => void;
}) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            Shipping
          </Text>
          <Switch
            label="Physical product"
            checked={variant.requiresShipping}
            onChange={(requiresShipping) =>
              onChange(
                // A digital product carries no weight, and leaving a stale one
                // behind would surface in the checkout's rate calculation.
                requiresShipping ? { requiresShipping } : { requiresShipping, weight: '' },
              )
            }
          />
        </InlineStack>

        {variant.requiresShipping ? (
          <TextField
            label="Product weight"
            autoComplete="off"
            inputMode="decimal"
            placeholder="0.0"
            value={variant.weight}
            onChange={(weight) => (WEIGHT_PATTERN.test(weight) ? onChange({ weight }) : undefined)}
            connectedRight={
              <Select
                label="Weight unit"
                labelHidden
                options={UNITS}
                value={variant.weightUnit}
                onChange={(weightUnit) => onChange({ weightUnit: weightUnit as WeightUnit })}
              />
            }
          />
        ) : null}
      </BlockStack>
    </Card>
  );
}
