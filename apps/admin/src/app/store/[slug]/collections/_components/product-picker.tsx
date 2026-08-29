'use client';

/**
 * The `Add products` browser for a manual collection
 * (docs/parity/collection-detail.md → Right rail 1). Owner: WS-B (B6).
 *
 * Only the modal lives here: the chosen products are rendered by the
 * `Collection items` grid, which is where Shopify shows them.
 */
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Box,
  Checkbox,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useApiQuery } from '../../../../../lib/api.ts';
import { type CollectionItem, toCollectionItem } from './collection-items.tsx';

export function ProductPickerModal({
  open,
  selected,
  onClose,
  onDone,
}: {
  open: boolean;
  selected: CollectionItem[];
  onClose: () => void;
  onDone: (products: CollectionItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<CollectionItem[]>(selected);

  const search = new URLSearchParams({ limit: '50' });
  if (query.trim() !== '') search.set('query', query.trim());
  const path = `/admin/api/products?${search.toString()}`;
  const products = useApiQuery<Paginated<Product>>(['products', path], path, { enabled: open });

  const toggle = (product: Product, checked: boolean) => {
    setChosen((current) =>
      checked
        ? current.some((p) => p.id === product.id)
          ? current
          : [...current, toCollectionItem(product)]
        : current.filter((p) => p.id !== product.id),
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add products"
      primaryAction={{ content: 'Done', onAction: () => onDone(chosen) }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <BlockStack gap="300">
          <TextField
            label="Search products"
            labelHidden
            autoComplete="off"
            placeholder="Search products"
            value={query}
            onChange={setQuery}
            clearButton
            onClearButtonClick={() => setQuery('')}
          />
          <ResourceList
            resourceName={{ singular: 'product', plural: 'products' }}
            loading={products.isFetching}
            items={products.data?.data ?? []}
            emptyState={
              <Box padding="400">
                <Text as="p" tone="subdued" alignment="center">
                  No products match that search.
                </Text>
              </Box>
            }
            renderItem={(product) => (
              <ResourceItem
                // ResourceList renders the items straight into its `ul`, so the
                // key has to come from here or React warns on every open.
                key={product.id}
                id={product.id}
                onClick={() => toggle(product, !chosen.some((p) => p.id === product.id))}
                media={
                  <Thumbnail source={product.images[0]?.url ?? ImageIcon} alt="" size="small" />
                }
              >
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <Checkbox
                    label={product.title}
                    labelHidden
                    checked={chosen.some((p) => p.id === product.id)}
                    onChange={(checked) => toggle(product, checked)}
                  />
                  <Text as="span" variant="bodyMd">
                    {product.title}
                  </Text>
                </InlineStack>
              </ResourceItem>
            )}
          />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
