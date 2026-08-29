'use client';

/**
 * Products index (PARITY.md → Index pages). Owner: WS-B (B5).
 *
 * Anatomy, top to bottom: title + "Add product" → card with tabs, then the
 * filter row, then the IndexTable, then pagination. Selecting rows swaps the
 * header for bulk actions.
 *
 * Pagination is cursor-based (SPEC §5), so "previous" is a stack of the cursors
 * already visited rather than an offset we can decrement.
 */
import { format } from '@merchant/config/money';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  IndexFilters,
  IndexTable,
  InlineStack,
  Modal,
  Page,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { ImageIcon, ProductIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LearnMore } from '../../../../components/shell/learn-more.tsx';
import { PageHeader } from '../../../../components/shell/page-header.tsx';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';

const PAGE_SIZE = 50;

const TABS = [
  { label: 'All', status: undefined },
  { label: 'Active', status: 'active' },
  { label: 'Draft', status: 'draft' },
  { label: 'Archived', status: 'archived' },
] as const;

/** B5: sort by title/created. The value encodes `sortKey sortOrder` for the API. */
const SORT_OPTIONS = [
  { label: 'Created', value: 'createdAt desc', directionLabel: 'Newest first' },
  { label: 'Created', value: 'createdAt asc', directionLabel: 'Oldest first' },
  { label: 'Title', value: 'title asc', directionLabel: 'A–Z' },
  { label: 'Title', value: 'title desc', directionLabel: 'Z–A' },
] as const;

/** PARITY.md badge table: Active is success, Draft is info. */
function StatusBadge({ status }: { status: Product['status'] }) {
  if (status === 'active') return <Badge tone="success">Active</Badge>;
  if (status === 'draft') return <Badge tone="info">Draft</Badge>;
  return <Badge>Archived</Badge>;
}

/** "12 in stock for 3 variants" — Shopify's phrasing on this column. */
function inventorySummary(product: Product): string {
  const total = product.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0);
  const count = product.variants.length;
  // A sold-out product reads "0 in stock", the way Shopify shows it — nothing
  // in this model is "untracked".
  if (count <= 1) return `${total} in stock`;
  return `${total} in stock for ${count} variants`;
}

function priceRange(product: Product): string {
  const prices = product.variants.map((v) => v.price);
  const first = prices[0];
  if (!first) return '—';
  const min = prices.reduce((a, b) => (b.amount < a.amount ? b : a), first);
  const max = prices.reduce((a, b) => (b.amount > a.amount ? b : a), first);
  return min.amount === max.amount ? format(min) : `${format(min)} – ${format(max)}`;
}

export default function ProductsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [vendor, setVendor] = useState('');
  const [sortSelected, setSortSelected] = useState<string[]>([SORT_OPTIONS[0].value]);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const status = TABS[tab]?.status;

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (status) search.set('status', status);
    if (query.trim() !== '') search.set('query', query.trim());
    if (vendor.trim() !== '') search.set('vendor', vendor.trim());
    const [sortKey, sortOrder] = (sortSelected[0] ?? '').split(' ');
    if (sortKey) search.set('sortKey', sortKey);
    if (sortOrder) search.set('sortOrder', sortOrder);
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/products?${search.toString()}`;
  }, [status, query, vendor, sortSelected, cursor]);

  const products = useApiQuery<Paginated<Product>>(['products', path], path, {
    keepPreviousData: true,
  });
  const rows = products.data?.data ?? [];

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(rows as unknown as Array<{ [key: string]: unknown; id: string }>);

  /** Reset paging whenever the result set itself changes shape. */
  const resetPaging = () => setCursorStack([]);

  const clearFilters = () => {
    setQuery('');
    setVendor('');
    resetPaging();
  };

  const applyToSelection = async (label: string, run: (id: string) => Promise<unknown>) => {
    setBulkBusy(true);
    try {
      await Promise.all(selectedResources.map(run));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show(label);
      clearSelection();
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setBulkBusy(false);
      setConfirmingDelete(false);
    }
  };

  const setStatus = (next: Product['status']) =>
    applyToSelection(next === 'archived' ? 'Products archived' : `Products set to ${next}`, (id) =>
      apiFetch(`/admin/api/products/${id}`, { method: 'PUT', body: { status: next } }),
    );

  if (products.isPending) return <PageSkeleton fullWidth primaryAction />;

  const empty =
    rows.length === 0 &&
    query.trim() === '' &&
    vendor.trim() === '' &&
    !status &&
    cursorStack.length === 0;

  return (
    <Page fullWidth>
      <BlockStack gap="400">
        <PageHeader
          icon={ProductIcon}
          title="Products"
          actions={
            <Button variant="primary" url={`/store/${slug}/products/new`}>
              Add product
            </Button>
          }
        />

        <Card padding="0">
          {empty ? (
            // Hand-built rather than Polaris `EmptyState`, which requires an
            // `image`: the only on-brand illustrations are Shopify's own CDN
            // assets, and PARITY.md forbids rendering those.
            <Box padding="800">
              <BlockStack gap="200" inlineAlign="center">
                <Text as="h2" variant="headingMd">
                  Add your first product
                </Text>
                <Text as="p" tone="subdued" alignment="center">
                  Add products to sell them on your online store.
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
                tabs={TABS.map((t, index) => ({
                  id: t.label,
                  content: t.label,
                  index,
                  onAction: () => {
                    setTab(index);
                    resetPaging();
                  },
                }))}
                selected={tab}
                onSelect={(index) => {
                  setTab(index);
                  resetPaging();
                }}
                queryValue={query}
                queryPlaceholder="Searching in all"
                onQueryChange={(value) => {
                  setQuery(value);
                  resetPaging();
                }}
                onQueryClear={() => {
                  setQuery('');
                  resetPaging();
                }}
                sortOptions={[...SORT_OPTIONS]}
                sortSelected={sortSelected}
                onSort={(selected) => {
                  setSortSelected(selected);
                  resetPaging();
                }}
                filters={[
                  {
                    key: 'vendor',
                    label: 'Vendor',
                    // `pinned`, not `shortcut`: IndexFilters' FiltersBar reads only
                    // `pinned` (Polaris 13.9.5 — `shortcut` belongs to
                    // LegacyFilters), so this filter rendered nowhere at all: the
                    // bar showed a bare "Add filter" and the vendor query the API
                    // has always supported was unreachable.
                    pinned: true,
                    filter: (
                      <TextField
                        label="Vendor"
                        labelHidden
                        autoComplete="off"
                        value={vendor}
                        onChange={(value) => {
                          setVendor(value);
                          resetPaging();
                        }}
                      />
                    ),
                  },
                ]}
                appliedFilters={
                  vendor.trim() === ''
                    ? []
                    : [
                        {
                          key: 'vendor',
                          label: `Vendor: ${vendor.trim()}`,
                          onRemove: () => {
                            setVendor('');
                            resetPaging();
                          },
                        },
                      ]
                }
                onClearAll={clearFilters}
                mode={mode}
                setMode={setMode}
                // Leaving filtering mode has to clear the vendor filter, not just
                // the search: Default mode renders no pills, so a kept filter left
                // the index showing 3 of 32 products with nothing on screen saying
                // why, and no control to undo it.
                cancelAction={{ onAction: clearFilters }}
                loading={products.isFetching}
                canCreateNewView={false}
              />

              <IndexTable
                resourceName={{ singular: 'product', plural: 'products' }}
                itemCount={rows.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: 'Product' },
                  { title: 'Status' },
                  { title: 'Inventory' },
                  { title: 'Price' },
                  { title: 'Vendor' },
                ]}
                promotedBulkActions={[
                  { content: 'Set as active', onAction: () => setStatus('active') },
                  { content: 'Set as draft', onAction: () => setStatus('draft') },
                ]}
                bulkActions={[
                  { content: 'Archive', onAction: () => setStatus('archived') },
                  { content: 'Delete', onAction: () => setConfirmingDelete(true) },
                ]}
                pagination={{
                  hasPrevious: cursorStack.length > 0,
                  hasNext: Boolean(products.data?.nextCursor),
                  onPrevious: () => setCursorStack((stack) => stack.slice(0, -1)),
                  onNext: () => {
                    const next = products.data?.nextCursor;
                    if (next) setCursorStack((stack) => [...stack, next]);
                  },
                }}
                emptyState={
                  <Box padding="800">
                    <Text as="p" tone="subdued" alignment="center">
                      No products found. Try changing the search or filters.
                    </Text>
                  </Box>
                }
              >
                {rows.map((product, index) => (
                  <IndexTable.Row
                    id={product.id}
                    key={product.id}
                    position={index}
                    selected={selectedResources.includes(product.id)}
                    onClick={() => router.push(`/store/${slug}/products/${product.id}`)}
                  >
                    <IndexTable.Cell>
                      <InlineStack gap="300" blockAlign="center" wrap={false}>
                        <Thumbnail
                          source={product.images[0]?.url ?? ImageIcon}
                          alt={product.images[0]?.altText ?? ''}
                          size="small"
                        />
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                      </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <StatusBadge status={product.status} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">
                        {inventorySummary(product)}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{priceRange(product)}</IndexTable.Cell>
                    <IndexTable.Cell>{product.vendor ?? '—'}</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </>
          )}
        </Card>

        <LearnMore resource="products" />
      </BlockStack>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${selectedResources.length} product${selectedResources.length === 1 ? '' : 's'}?`}
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: bulkBusy,
          onAction: () =>
            applyToSelection('Products deleted', (id) =>
              apiFetch(`/admin/api/products/${id}`, { method: 'DELETE' }),
            ),
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This can’t be undone. Orders that already include these products keep their details.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
