'use client';

/**
 * The Price card (docs/parity/product-form.md → left column card 4).
 * Owner: WS-B (B5).
 *
 * Only rendered while the product has NO options: Shopify keeps price at the
 * product level until a variant matrix exists, and moves it into the variants
 * table the moment one does. It edits the single default variant, because that
 * is where the price actually lives in our model and in Shopify's.
 *
 * `Unit price` and `Cost per item` are pills on the real card and are absent
 * here: neither column exists in our schema, and CLAUDE.md §8 wants no control
 * that cannot save.
 */
import { BlockStack, Card, Checkbox, Text, TextField } from '@shopify/polaris';
import { PRICE_PATTERN, type VariantDraft } from '../../../../../lib/product-draft.ts';
import { CollapsibleFields } from './collapsible-fields.tsx';

export function PricingCard({
  variant,
  currencySymbol,
  error,
  onChange,
}: {
  variant: VariantDraft;
  currencySymbol: string;
  error?: string;
  onChange: (patch: Partial<VariantDraft>) => void;
}) {
  // Kept as a STRING all the way to the API boundary; a Number here is how
  // fractional cents get lost (CLAUDE.md §5).
  const money = (key: 'price' | 'compareAtPrice') => (next: string) => {
    if (PRICE_PATTERN.test(next)) onChange({ [key]: next });
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Price
        </Text>

        <TextField
          label="Price"
          autoComplete="off"
          inputMode="decimal"
          prefix={currencySymbol}
          placeholder="0.00"
          value={variant.price}
          error={error}
          onChange={money('price')}
        />

        <CollapsibleFields
          fields={[
            {
              id: 'compare-at',
              label: 'Compare-at price',
              filled: variant.compareAtPrice !== '',
              field: (
                <TextField
                  label="Compare-at price"
                  autoComplete="off"
                  inputMode="decimal"
                  prefix={currencySymbol}
                  placeholder="0.00"
                  helpText="Shown struck through next to the price."
                  value={variant.compareAtPrice}
                  onChange={money('compareAtPrice')}
                />
              ),
            },
            {
              id: 'charge-tax',
              label: 'Charge tax',
              value: variant.taxable ? 'Yes' : 'No',
              // Taxable is the default, so the pill only opens itself when the
              // merchant has already turned tax off on this product.
              filled: !variant.taxable,
              field: (
                <Checkbox
                  label="Charge tax on this product"
                  checked={variant.taxable}
                  onChange={(taxable) => onChange({ taxable })}
                />
              ),
            },
          ]}
        />
      </BlockStack>
    </Card>
  );
}
