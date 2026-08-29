'use client';

/**
 * The Inventory card (docs/parity/product-form.md → left column card 5).
 * Owner: WS-B (B5). Rendered only while the product has no options, like Price.
 *
 * One row per location with its own editable quantity, exactly as Shopify does
 * — the seeded demo has two locations, and a single summed field would have to
 * pick one of them silently. These numbers do NOT ride along with the product
 * write: the form posts the changed cells to the inventory service afterwards,
 * because that is the only path that leaves an `InventoryAdjustment` behind
 * (CLAUDE.md §9).
 *
 * The real card carries a "Track quantity" switch in its heading row. We have
 * no per-variant tracking flag — cart, checkout and storefront availability all
 * read `inventoryPolicy` — and a switch that changes nothing is worse than an
 * absent one (CLAUDE.md §8), so it is left out. Logged in DECISIONS.md.
 */
import type { Location } from '@merchant/contracts/locations';
import {
  BlockStack,
  Box,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Text,
  TextField,
  Tooltip,
} from '@shopify/polaris';
import type { VariantDraft } from '../../../../../lib/product-draft.ts';
import type { StockByLocation } from '../../../../../lib/product-stock.ts';
import { CollapsibleFields } from './collapsible-fields.tsx';

/** Whole units only — a quantity is counted, not measured. */
const QUANTITY_PATTERN = /^\d*$/;

export function InventoryCard({
  variant,
  locations,
  stock,
  onStockChange,
  onChange,
}: {
  variant: VariantDraft;
  locations: Location[];
  stock: StockByLocation;
  onStockChange: (next: StockByLocation) => void;
  onChange: (patch: Partial<VariantDraft>) => void;
}) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Inventory
        </Text>

        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="span" variant="bodySm" tone="subdued">
              Location
            </Text>
            <Tooltip content="Inventory at your store that can be sold.">
              <Text as="span" variant="bodySm" tone="subdued">
                Quantity
              </Text>
            </Tooltip>
          </InlineStack>
          <Divider />

          {locations.map((location) => (
            <InlineStack
              key={location.id}
              align="space-between"
              blockAlign="center"
              gap="300"
              wrap={false}
            >
              <Text as="span" variant="bodyMd">
                {location.name}
              </Text>
              <Box width="96px">
                <TextField
                  label={`Quantity at ${location.name}`}
                  labelHidden
                  autoComplete="off"
                  inputMode="numeric"
                  align="right"
                  value={stock[location.id] ?? '0'}
                  onChange={(next) =>
                    QUANTITY_PATTERN.test(next)
                      ? onStockChange({ ...stock, [location.id]: next })
                      : undefined
                  }
                />
              </Box>
            </InlineStack>
          ))}
        </BlockStack>

        <CollapsibleFields
          fields={[
            {
              id: 'sku',
              label: 'SKU',
              filled: variant.sku !== '',
              field: (
                <TextField
                  label="SKU (Stock Keeping Unit)"
                  autoComplete="off"
                  value={variant.sku}
                  onChange={(sku) => onChange({ sku })}
                />
              ),
            },
            {
              id: 'barcode',
              label: 'Barcode',
              filled: variant.barcode !== '',
              field: (
                <TextField
                  label="Barcode (ISBN, UPC, GTIN, etc.)"
                  autoComplete="off"
                  value={variant.barcode}
                  onChange={(barcode) => onChange({ barcode })}
                />
              ),
            },
            {
              id: 'oversell',
              label: 'Sell when out of stock',
              value: variant.inventoryPolicy === 'continue' ? 'On' : 'Off',
              filled: variant.inventoryPolicy === 'continue',
              field: (
                <Checkbox
                  label="Continue selling when out of stock"
                  checked={variant.inventoryPolicy === 'continue'}
                  onChange={(on) => onChange({ inventoryPolicy: on ? 'continue' : 'deny' })}
                />
              ),
            },
          ]}
        />
      </BlockStack>
    </Card>
  );
}
