'use client';

/**
 * The right rail's `Products` card (docs/parity/collection-detail.md → Right rail).
 * Owner: WS-B (B6).
 *
 * Heading with a sort control beside it, then a bordered group of two
 * full-width rows — `Add condition` and `Add products` — and an outlined
 * `Exclude` button below the group.
 *
 * These two rows are how Shopify decides a collection's kind: there is no type
 * chooser on the page. Adding a condition makes the collection automated and
 * adding products makes it manual, which is exactly what `PUT
 * /admin/api/collections/:id` accepts (DECISIONS 2026-08-28 WS-B: converting to
 * smart drops the hand-picked members). The form confirms before it destroys
 * either side.
 */
import type { CollectionSortOrder, CollectionType } from '@merchant/contracts/collections';
import {
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  InlineStack,
  Popover,
  Text,
} from '@shopify/polaris';
import { PlusCircleIcon, PlusIcon, ProductAddIcon, SortIcon } from '@shopify/polaris-icons';
import { useState } from 'react';

const SORT_OPTIONS: { label: string; value: CollectionSortOrder }[] = [
  { label: 'Manually', value: 'manual' },
  { label: 'Best selling', value: 'best-selling' },
  { label: 'Product title A–Z', value: 'title-asc' },
  { label: 'Product title Z–A', value: 'title-desc' },
  { label: 'Price, low to high', value: 'price-asc' },
  { label: 'Price, high to low', value: 'price-desc' },
  { label: 'Newest first', value: 'created-desc' },
];

export function ProductsRail({
  type,
  sortOrder,
  onSort,
  onAddCondition,
  onAddProducts,
  onExclude,
}: {
  type: CollectionType;
  sortOrder: CollectionSortOrder;
  onSort: (sortOrder: CollectionSortOrder) => void;
  onAddCondition: () => void;
  onAddProducts: () => void;
  onExclude: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);

  // A smart collection has no dragged positions to honour, and the API rewrites
  // `manual` to `created-desc` on one — so it is not offered.
  const options =
    type === 'smart' ? SORT_OPTIONS.filter((o) => o.value !== 'manual') : SORT_OPTIONS;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            Products
          </Text>
          <Popover
            active={sortOpen}
            preferredAlignment="right"
            onClose={() => setSortOpen(false)}
            activator={
              <Button
                variant="tertiary"
                icon={SortIcon}
                accessibilityLabel="Sort products"
                onClick={() => setSortOpen((open) => !open)}
              />
            }
          >
            <Box padding="300" minWidth="220px">
              <ChoiceList
                title="Sort products by"
                choices={options}
                selected={[sortOrder]}
                onChange={([value]) => {
                  if (value) onSort(value as CollectionSortOrder);
                  setSortOpen(false);
                }}
              />
            </Box>
          </Popover>
        </InlineStack>

        <Box borderWidth="025" borderColor="border" borderRadius="200" overflowX="hidden">
          <Box padding="100">
            <Button
              fullWidth
              textAlign="left"
              variant="tertiary"
              icon={PlusCircleIcon}
              onClick={onAddCondition}
            >
              Add condition
            </Button>
          </Box>
          <Box borderBlockStartWidth="025" borderColor="border" padding="100">
            <Button
              fullWidth
              textAlign="left"
              variant="tertiary"
              icon={ProductAddIcon}
              onClick={onAddProducts}
            >
              Add products
            </Button>
          </Box>
        </Box>

        <InlineStack>
          {/* Shopify excludes named products; our rule model excludes by a
              negated condition ("Product title does not contain …"), which is
              the same idea in the shape the API can save. */}
          <Button icon={PlusIcon} onClick={onExclude}>
            Exclude
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
