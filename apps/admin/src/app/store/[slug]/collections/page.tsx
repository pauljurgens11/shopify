'use client';

import type { Collection } from '@merchant/contracts/collections';
/**
 * Collections index (PARITY.md → Index pages). Owner: WS-B (B6).
 *
 * Same anatomy as Products, one card: tabs, filter row, IndexTable,
 * pagination. Collections live under Products in the nav and share its
 * permission area.
 */
import type { Paginated } from '@merchant/contracts/common';
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
  Thumbnail,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';

const PAGE_SIZE = 50;

const TABS = [
  { label: 'All', type: undefined },
  { label: 'Manual', type: 'manual' },
  { label: 'Automated', type: 'smart' },
] as const;

export default function CollectionsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const type = TABS[tab]?.type;

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (type) search.set('type', type);
    if (query.trim() !== '') search.set('query', query.trim());
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/collections?${search.toString()}`;
  }, [type, query, cursor]);

  const collections = useApiQuery<Paginated<Collection>>(['collections', path], path, {
    keepPreviousData: true,
  });
  const rows = collections.data?.data ?? [];

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(rows as unknown as Array<{ [key: string]: unknown; id: string }>);

  const resetPaging = () => setCursorStack([]);

  const destroySelected = async () => {
    setBusy(true);
    try {
      await Promise.all(
        selectedResources.map((id) =>
          apiFetch(`/admin/api/collections/${id}`, { method: 'DELETE' }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.show('Collections deleted');
      clearSelection();
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  };

  if (collections.isPending) return <PageSkeleton fullWidth primaryAction />;

  const empty = rows.length === 0 && query.trim() === '' && !type && cursorStack.length === 0;

  return (
    <Page
      fullWidth
      title="Collections"
      primaryAction={{ content: 'Create collection', url: `/store/${slug}/collections/new` }}
    >
      <Card padding="0">
        {empty ? (
          <Box padding="800">
            <BlockStack gap="200" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Group your products into collections
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Collections make it easier for customers to find products by category.
              </Text>
              <Box paddingBlockStart="300">
                <Button variant="primary" url={`/store/${slug}/collections/new`}>
                  Create collection
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
              filters={[]}
              onClearAll={() => {
                setQuery('');
                resetPaging();
              }}
              mode={mode}
              setMode={setMode}
              cancelAction={{ onAction: () => setQuery('') }}
              loading={collections.isFetching}
              canCreateNewView={false}
            />

            <IndexTable
              resourceName={{ singular: 'collection', plural: 'collections' }}
              itemCount={rows.length}
              selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[{ title: 'Collection' }, { title: 'Products' }, { title: 'Type' }]}
              bulkActions={[{ content: 'Delete', onAction: () => setConfirmingDelete(true) }]}
              pagination={{
                hasPrevious: cursorStack.length > 0,
                hasNext: Boolean(collections.data?.nextCursor),
                onPrevious: () => setCursorStack((stack) => stack.slice(0, -1)),
                onNext: () => {
                  const next = collections.data?.nextCursor;
                  if (next) setCursorStack((stack) => [...stack, next]);
                },
              }}
              emptyState={
                <Box padding="800">
                  <Text as="p" tone="subdued" alignment="center">
                    No collections found. Try changing the search or filters.
                  </Text>
                </Box>
              }
            >
              {rows.map((collection, index) => (
                <IndexTable.Row
                  id={collection.id}
                  key={collection.id}
                  position={index}
                  selected={selectedResources.includes(collection.id)}
                  onClick={() => router.push(`/store/${slug}/collections/${collection.id}`)}
                >
                  <IndexTable.Cell>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Thumbnail source={collection.imageUrl ?? ImageIcon} alt="" size="small" />
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {collection.title}
                      </Text>
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {collection.productCount}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {/* Shopify's wording for the two kinds. */}
                    <Badge>{collection.type === 'smart' ? 'Automated' : 'Manual'}</Badge>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </>
        )}
      </Card>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${selectedResources.length} collection${selectedResources.length === 1 ? '' : 's'}?`}
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: busy,
          onAction: destroySelected,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This can’t be undone. The products in {selectedResources.length === 1 ? 'it' : 'them'}{' '}
            are not deleted.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
