'use client';

/**
 * The Variants card (PARITY.md: option builder → variant table with
 * price/available per row). Owner: WS-B (B5).
 *
 * Shopify's flow, mirrored: a product has one implicit variant until you add an
 * option, and the moment an option has values the table appears with a row per
 * combination. Editing an option regenerates the table without losing the
 * prices already typed — `reconcileVariants` is the client half of the same
 * promise the API keeps server-side.
 */
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  InlineError,
  InlineStack,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import {
  addOptionValues,
  MAX_OPTIONS,
  type OptionDraft,
  PRICE_PATTERN,
  reconcileVariants,
  renameOptionKeys,
  usableOptions,
  type VariantDraft,
} from '../../../../../lib/product-draft.ts';

/** The values input: type a value, press Enter or comma, it becomes a chip. */
function OptionValues({
  values,
  onChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [pending, setPending] = useState('');

  /**
   * Adds every value in one call. A paste of "S, M, L" arrives as ONE change
   * event, so committing them one at a time would start each from the same
   * stale `values` prop and only the last would survive.
   */
  const commit = (raws: string[]) => {
    const next = addOptionValues(values, raws);
    if (next.length !== values.length) onChange(next);
  };

  return (
    <BlockStack gap="200">
      {/* Polaris TextField exposes no onKeyDown, so Enter and Backspace are
          caught on a wrapper — the events bubble out of the real input. */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: wrapper only relays the input's own keys */}
      <div
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit([pending]);
            setPending('');
          }
          if (event.key === 'Backspace' && pending === '' && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
      >
        <TextField
          label="Option values"
          placeholder="Add a value and press Enter"
          autoComplete="off"
          value={pending}
          onChange={(next) => {
            // A comma commits too, so pasting "S, M, L" does the obvious thing.
            if (next.includes(',')) {
              const parts = next.split(',');
              const last = parts.pop() ?? '';
              commit(parts);
              setPending(last);
              return;
            }
            setPending(next);
          }}
          onBlur={() => {
            commit([pending]);
            setPending('');
          }}
        />
      </div>
      {values.length > 0 ? (
        <InlineStack gap="100" wrap>
          {values.map((value) => (
            <Tag key={value} onRemove={() => onChange(values.filter((v) => v !== value))}>
              {value}
            </Tag>
          ))}
        </InlineStack>
      ) : null}
    </BlockStack>
  );
}

export function VariantsCard({
  options,
  variants,
  currencySymbol,
  stockLabel,
  stockEditable,
  error,
  onChange,
}: {
  options: OptionDraft[];
  variants: VariantDraft[];
  currencySymbol: string;
  /** Label over the stock column — the value is the sum across locations. */
  stockLabel: string;
  stockEditable: boolean;
  error?: string;
  onChange: (next: { options: OptionDraft[]; variants: VariantDraft[] }) => void;
}) {
  const setOptions = (next: OptionDraft[]) =>
    // Renamed options are re-keyed first, so editing a name keeps every row's
    // id, price, sku and stock instead of regenerating the table from scratch.
    onChange({
      options: next,
      variants: reconcileVariants(next, renameOptionKeys(options, next, variants)),
    });

  const setVariant = (index: number, patch: Partial<VariantDraft>) =>
    onChange({
      options,
      variants: variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
    });

  const hasMatrix = usableOptions(options).length > 0;

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Variants
        </Text>

        {options.length === 0 ? (
          <Button
            variant="plain"
            onClick={() => setOptions([{ name: '', values: [] }])}
            accessibilityLabel="Add options like size or color"
          >
            + Add options like size or color
          </Button>
        ) : (
          <BlockStack gap="400">
            {options.map((option, index) => (
              <Box
                // Index is the identity here: two options may share a blank name
                // while being typed, and renaming one must not remount it.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={`option-${index}`}
                borderWidth="025"
                borderColor="border"
                borderRadius="200"
                padding="300"
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingXs">
                      Option {index + 1}
                    </Text>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => setOptions(options.filter((_, i) => i !== index))}
                    >
                      Delete
                    </Button>
                  </InlineStack>

                  <TextField
                    label="Option name"
                    autoComplete="off"
                    placeholder="Size"
                    value={option.name}
                    onChange={(name) =>
                      setOptions(options.map((o, i) => (i === index ? { ...o, name } : o)))
                    }
                  />
                  <OptionValues
                    values={option.values}
                    onChange={(values) =>
                      setOptions(options.map((o, i) => (i === index ? { ...o, values } : o)))
                    }
                  />
                </BlockStack>
              </Box>
            ))}

            {options.length < MAX_OPTIONS ? (
              <Button
                variant="plain"
                onClick={() => setOptions([...options, { name: '', values: [] }])}
              >
                + Add another option
              </Button>
            ) : null}
          </BlockStack>
        )}

        {error ? <InlineError message={error} fieldID="product-variants" /> : null}

        <BlockStack gap="200">
          {hasMatrix ? (
            <Text as="h3" variant="headingXs">
              {variants.length} variant{variants.length === 1 ? '' : 's'}
            </Text>
          ) : null}

          {variants.map((variant, index) => (
            <Box
              key={variant.key}
              borderBlockStartWidth="025"
              borderColor="border"
              paddingBlockStart="300"
            >
              <BlockStack gap="200">
                {hasMatrix ? (
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {variant.title}
                    </Text>
                    {variant.id ? null : <Badge tone="info">New</Badge>}
                  </InlineStack>
                ) : null}

                <InlineStack gap="300" wrap>
                  <Box minWidth="140px">
                    <TextField
                      label="Price"
                      autoComplete="off"
                      inputMode="decimal"
                      prefix={currencySymbol}
                      placeholder="0.00"
                      value={variant.price}
                      // Kept as a STRING all the way to the API boundary; a
                      // Number here is how fractional cents get lost.
                      onChange={(price) =>
                        PRICE_PATTERN.test(price) ? setVariant(index, { price }) : undefined
                      }
                    />
                  </Box>
                  <Box minWidth="160px">
                    <TextField
                      label="SKU"
                      autoComplete="off"
                      value={variant.sku}
                      onChange={(sku) => setVariant(index, { sku })}
                    />
                  </Box>
                  <Box minWidth="160px">
                    <TextField
                      label={stockLabel}
                      autoComplete="off"
                      type="number"
                      min={0}
                      disabled={!stockEditable}
                      helpText={stockEditable ? undefined : 'Set quantities on the Inventory page.'}
                      value={variant.available}
                      onChange={(available) => setVariant(index, { available })}
                    />
                  </Box>
                </InlineStack>
              </BlockStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
