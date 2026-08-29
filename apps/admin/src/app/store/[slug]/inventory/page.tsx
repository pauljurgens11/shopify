'use client';

import type { Paginated } from '@merchant/contracts/common';
/**
 * Inventory index (PARITY.md → Index pages). Owner: WS-B (B6).
 *
 * A row per variant, a location switcher, and an editable "Available" cell.
 *
 * Edits go to B4's `/admin/api/inventory/set`, never to a variant PUT: that
 * endpoint is the only one that writes an `InventoryAdjustment` alongside the
 * quantity, and the history is the whole point of having a service
 * (CLAUDE.md §9). Typing an absolute count is what the cell means, so `set` is
 * the right half of that API — it records the delta it had to apply.
 */
import type { InventoryRow } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';
import {
  BlockStack,
  Box,
  Button,
  Card,
  IndexFilters,
  IndexTable,
  InlineStack,
  Page,
  Select,
  Text,
  TextField,
  Thumbnail,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { ImageIcon, InventoryIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LearnMore } from '../../../../components/shell/learn-more.tsx';
import { PageHeader } from '../../../../components/shell/page-header.tsx';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { SaveBar } from '../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';
import { changedLevels, parseAvailable } from '../../../../lib/inventory-edits.ts';

const PAGE_SIZE = 50;

export default function InventoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [locationId, setLocationId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  /** variantId → what the merchant has typed but not yet saved. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { mode, setMode } = useSetIndexFiltersMode();

  const locations = useApiQuery<{ data: Location[] }>(['locations'], '/admin/api/locations');
  // Until one is chosen the API returns every location's column; the switcher
  // narrows to one, which is what makes a single editable cell unambiguous.
  const activeLocation =
    locations.data?.data.find((l) => l.id === locationId) ?? locations.data?.data[0];

  const cursor = cursorStack.at(-1);
  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (activeLocation) search.set('locationId', activeLocation.id);
    if (query.trim() !== '') search.set('query', query.trim());
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/inventory?${search.toString()}`;
  }, [activeLocation, query, cursor]);

  const inventory = useApiQuery<Paginated<InventoryRow>>(['inventory', path], path, {
    enabled: Boolean(activeLocation),
    keepPreviousData: true,
  });
  const rows = inventory.data?.data ?? [];

  const resetPaging = () => {
    setCursorStack([]);
    setDrafts({});
  };

  const pending = changedLevels(rows, drafts, activeLocation?.id ?? '');

  const saveEdits = async () => {
    if (pending.length === 0) return;
    setSaving(true);
    try {
      await apiFetch('/admin/api/inventory/set', { method: 'POST', body: { levels: pending } });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      // The locations list carries a stocked-variant count that just moved.
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDrafts({});
      toast.show(pending.length === 1 ? 'Inventory updated' : `${pending.length} items updated`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  if (locations.isPending || (inventory.isPending && Boolean(activeLocation))) {
    return <PageSkeleton fullWidth />;
  }

  const availableAt = (row: InventoryRow) =>
    row.levels.find((level) => level.locationId === activeLocation?.id)?.available ?? 0;

  return (
    <Page fullWidth>
      {/* The dirty grid uses the same contextual save bar as every other admin
          form (PARITY.md → Global chrome), not a second pair of buttons. */}
      <SaveBar
        dirty={pending.length > 0}
        saving={saving}
        onSave={saveEdits}
        onDiscard={() => setDrafts({})}
      />

      <BlockStack gap="400">
        <PageHeader icon={InventoryIcon} title="Inventory" />

        <BlockStack gap="300">
          {activeLocation ? (
            <InlineStack align="end">
              <Box minWidth="260px">
                <Select
                  label="Location"
                  labelInline
                  options={(locations.data?.data ?? []).map((location) => ({
                    label: location.name,
                    value: location.id,
                  }))}
                  value={activeLocation.id}
                  onChange={(next) => {
                    setLocationId(next);
                    resetPaging();
                  }}
                />
              </Box>
            </InlineStack>
          ) : null}

          <Card padding="0">
            {!activeLocation ? (
              // A brand-new shop has no locations, and stock is counted per
              // location — so the honest empty state points at Locations rather
              // than blaming an empty catalog.
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="h2" variant="headingMd">
                    Add a location to track inventory
                  </Text>
                  <Text as="p" tone="subdued" alignment="center">
                    Stock is counted at the places you store and ship products from.
                  </Text>
                  <Box paddingBlockStart="300">
                    <Button variant="primary" url={`/store/${slug}/locations`}>
                      Add location
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            ) : rows.length === 0 && query.trim() === '' && cursorStack.length === 0 ? (
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="h2" variant="headingMd">
                    No products to track yet
                  </Text>
                  <Text as="p" tone="subdued" alignment="center">
                    Inventory appears here once you add products.
                  </Text>
                  <Box paddingBlockStart="300">
                    <Button variant="primary" url={`/store/${slug}/products/new`}>
                      Add product
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            ) : (
              <>
                <IndexFilters
                  tabs={[]}
                  selected={0}
                  queryValue={query}
                  queryPlaceholder="Search products"
                  onQueryChange={(value) => {
                    setQuery(value);
                    resetPaging();
                  }}
                  onQueryClear={() => {
                    setQuery('');
                    resetPaging();
                  }}
                  filters={[]}
                  onClearAll={() => {
                    setQuery('');
                    resetPaging();
                  }}
                  mode={mode}
                  setMode={setMode}
                  cancelAction={{ onAction: () => setQuery('') }}
                  loading={inventory.isFetching}
                  canCreateNewView={false}
                />

                <IndexTable
                  resourceName={{ singular: 'item', plural: 'items' }}
                  itemCount={rows.length}
                  selectable={false}
                  headings={[{ title: 'Product' }, { title: 'SKU' }, { title: 'Available' }]}
                  pagination={{
                    hasPrevious: cursorStack.length > 0,
                    hasNext: Boolean(inventory.data?.nextCursor),
                    onPrevious: () => {
                      setCursorStack((stack) => stack.slice(0, -1));
                      setDrafts({});
                    },
                    onNext: () => {
                      const next = inventory.data?.nextCursor;
                      if (next) {
                        setCursorStack((stack) => [...stack, next]);
                        setDrafts({});
                      }
                    },
                  }}
                  emptyState={
                    <Box padding="800">
                      <Text as="p" tone="subdued" alignment="center">
                        No items match that search.
                      </Text>
                    </Box>
                  }
                >
                  {rows.map((row, index) => (
                    <IndexTable.Row id={row.variantId} key={row.variantId} position={index}>
                      <IndexTable.Cell>
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                          <Thumbnail source={row.imageUrl ?? ImageIcon} alt="" size="small" />
                          <BlockStack gap="0">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                              {row.productTitle}
                            </Text>
                            {row.variantTitle === 'Default Title' ? null : (
                              <Text as="span" tone="subdued" variant="bodySm">
                                {row.variantTitle}
                              </Text>
                            )}
                          </BlockStack>
                        </InlineStack>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued">
                          {row.sku ?? '—'}
                        </Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        {/* Clicks inside the cell must not bubble to the row. */}
                        {/** biome-ignore lint/a11y/noStaticElementInteractions: containment only */}
                        {/** biome-ignore lint/a11y/useKeyWithClickEvents: containment only */}
                        <div onClick={(event) => event.stopPropagation()} style={{ maxWidth: 96 }}>
                          <TextField
                            label={`Available for ${row.productTitle}`}
                            labelHidden
                            autoComplete="off"
                            type="number"
                            min={0}
                            value={drafts[row.variantId] ?? String(availableAt(row))}
                            onChange={(value) =>
                              setDrafts((current) => ({ ...current, [row.variantId]: value }))
                            }
                            error={
                              drafts[row.variantId] !== undefined &&
                              parseAvailable(drafts[row.variantId] ?? '') === null
                            }
                          />
                        </div>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </>
            )}
          </Card>
        </BlockStack>

        <LearnMore resource="inventory" />
      </BlockStack>
    </Page>
  );
}
