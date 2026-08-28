'use client';

/**
 * Manual collection membership: the chosen products, and the modal that picks
 * them (PARITY.md → Collection form). Owner: WS-B (B6).
 *
 * Order is the collection's `manual` sort order, so the ↑/↓ controls are the
 * merchant's merchandising, not decoration.
 */
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Box,
  Button,
  Card,
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

/** Just enough of a product to render a row; the form never edits one here. */
export type PickedProduct = { id: string; title: string; imageUrl: string | null };

function PickerModal({
  open,
  selected,
  onClose,
  onDone,
}: {
  open: boolean;
  selected: PickedProduct[];
  onClose: () => void;
  onDone: (products: PickedProduct[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<PickedProduct[]>(selected);

  const search = new URLSearchParams({ limit: '50' });
  if (query.trim() !== '') search.set('query', query.trim());
  const path = `/admin/api/products?${search.toString()}`;
  const products = useApiQuery<Paginated<Product>>(['products', path], path, { enabled: open });

  const toggle = (product: Product, checked: boolean) => {
    setChosen((current) =>
      checked
        ? current.some((p) => p.id === product.id)
          ? current
          : [
              ...current,
              { id: product.id, title: product.title, imageUrl: product.images[0]?.url ?? null },
            ]
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

export function ProductPicker({
  products,
  onChange,
}: {
  products: PickedProduct[];
  onChange: (products: PickedProduct[]) => void;
}) {
  const [picking, setPicking] = useState(false);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= products.length) return;
    const next = [...products];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            Products
          </Text>
          <Button onClick={() => setPicking(true)}>Add products</Button>
        </InlineStack>

        {products.length === 0 ? (
          <Box paddingBlock="400">
            <Text as="p" tone="subdued" alignment="center">
              There are no products in this collection yet.
            </Text>
          </Box>
        ) : (
          <BlockStack gap="0">
            {products.map((product, index) => (
              <Box
                key={product.id}
                borderBlockStartWidth={index === 0 ? '0' : '025'}
                borderColor="border"
                paddingBlock="300"
              >
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <Text as="span" tone="subdued" variant="bodySm">
                    {index + 1}
                  </Text>
                  <Thumbnail source={product.imageUrl ?? ImageIcon} alt="" size="small" />
                  <Box width="100%">
                    <Text as="span" variant="bodyMd">
                      {product.title}
                    </Text>
                  </Box>
                  {/* Reordering by buttons, not drag: the locked stack has no
                      DnD library and adding one is a substitution (SPEC §3). */}
                  <Button
                    size="micro"
                    variant="tertiary"
                    accessibilityLabel={`Move ${product.title} up`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="micro"
                    variant="tertiary"
                    accessibilityLabel={`Move ${product.title} down`}
                    disabled={index === products.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="micro"
                    variant="tertiary"
                    tone="critical"
                    accessibilityLabel={`Remove ${product.title}`}
                    onClick={() => onChange(products.filter((p) => p.id !== product.id))}
                  >
                    Remove
                  </Button>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        )}
      </BlockStack>

      {picking ? (
        <PickerModal
          open={picking}
          selected={products}
          onClose={() => setPicking(false)}
          onDone={(next) => {
            onChange(next);
            setPicking(false);
          }}
        />
      ) : null}
    </Card>
  );
}
