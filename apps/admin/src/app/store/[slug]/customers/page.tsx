'use client';

/**
 * Customers index (PARITY.md → Index pages). Owner: WS-C (C6).
 *
 * Title + "Add customer" → card with segment tabs, filter row, IndexTable,
 * cursor pagination. The segments are C4's, computed server-side: "returning"
 * is more than one order, "new" is a FIRST order inside 30 days.
 *
 * `ordersCount` and `totalSpent` arrive derived from the API — the columns of
 * the same name on the row are always 0 and must not be read (AGENT-LOG, C4).
 */
import { format } from '@merchant/config/money';
import type { Paginated } from '@merchant/contracts/common';
import type { Customer } from '@merchant/contracts/customers';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  IndexFilters,
  IndexTable,
  Modal,
  Page,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';

const PAGE_SIZE = 50;

/** Shopify's customer segment tabs, in Shopify's order. */
const TABS = [
  { label: 'All', segment: undefined },
  { label: 'New', segment: 'new' },
  { label: 'Returning', segment: 'returning' },
  { label: 'Abandoned checkouts', segment: 'abandoned-checkout' },
] as const;

/**
 * A segment tab can be empty without anything being wrong — "Abandoned
 * checkouts" is empty on a freshly seeded shop by construction, and
 * "No customers found. Try changing the filters" would be a lie there. Each
 * tab explains its own emptiness instead (CLAUDE.md §8, real empty states).
 */
const SEGMENT_EMPTY: Record<string, { heading: string; body: string }> = {
  new: {
    heading: 'No new customers',
    body: 'Customers who placed their first order in the last 30 days show up here.',
  },
  returning: {
    heading: 'No returning customers yet',
    body: 'Customers appear here once they have placed more than one order.',
  },
  'abandoned-checkout': {
    heading: 'No abandoned checkouts',
    body: 'Checkouts started in the last 72 hours but never completed show up here.',
  },
};

/** The sort keys `listCustomers` actually honours (C4). */
const SORT_OPTIONS = [
  { label: 'Date added', value: 'createdAt desc' as const, directionLabel: 'Newest first' },
  { label: 'Date added', value: 'createdAt asc' as const, directionLabel: 'Oldest first' },
  { label: 'Last name', value: 'lastName asc' as const, directionLabel: 'A–Z' },
  { label: 'Last name', value: 'lastName desc' as const, directionLabel: 'Z–A' },
  { label: 'Email', value: 'email asc' as const, directionLabel: 'A–Z' },
  { label: 'Email', value: 'email desc' as const, directionLabel: 'Z–A' },
];

function customerName(customer: Customer): string {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return name === '' ? customer.email : name;
}

export default function CustomersPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<string[]>(['createdAt desc']);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const segment = TABS[tab]?.segment;

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (segment) search.set('segment', segment);
    if (query.trim() !== '') search.set('query', query.trim());
    const [sortKey, sortOrder] = (sort[0] ?? '').split(' ');
    if (sortKey) search.set('sortKey', sortKey);
    if (sortOrder) search.set('sortOrder', sortOrder);
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/customers?${search.toString()}`;
  }, [segment, query, sort, cursor]);

  const customers = useApiQuery<Paginated<Customer>>(['customers', path], path, {
    keepPreviousData: true,
  });
  const rows = customers.data?.data ?? [];

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(rows as unknown as Array<{ [key: string]: unknown; id: string }>);

  const resetPaging = () => setCursorStack([]);

  /**
   * The checkbox column has to lead somewhere — a bulk bar with no actions in
   * it is a dead control (CLAUDE.md §8).
   */
  const deleteSelected = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(
        selectedResources.map((id) => apiFetch(`/admin/api/customers/${id}`, { method: 'DELETE' })),
      );
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.show('Customers deleted');
      clearSelection();
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setBulkBusy(false);
      setConfirmingDelete(false);
    }
  };

  if (customers.isPending) return <PageSkeleton />;

  // A failed load must never read as "no customers yet" — that empty state
  // invites the merchant to re-add customers they already have.
  if (customers.isError) {
    return (
      <Page
        title="Customers"
        primaryAction={{ content: 'Add customer', url: `/store/${slug}/customers/new` }}
      >
        <Banner
          tone="critical"
          title="Customers could not be loaded"
          action={{ content: 'Try again', onAction: () => customers.refetch() }}
        >
          <p>{customers.error.message}</p>
        </Banner>
      </Page>
    );
  }

  const empty = rows.length === 0 && query.trim() === '' && !segment && cursorStack.length === 0;

  // An unfiltered segment that is simply empty explains itself; a search that
  // found nothing gets the "change the filters" line instead.
  const segmentEmpty = query.trim() === '' && segment ? SEGMENT_EMPTY[segment] : undefined;

  return (
    <Page
      fullWidth
      title="Customers"
      primaryAction={{ content: 'Add customer', url: `/store/${slug}/customers/new` }}
    >
      <Card padding="0">
        {empty ? (
          <Box padding="800">
            <BlockStack gap="200" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Everything customers-related in one place
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Manage customer details, see their order history and group them into segments.
              </Text>
              <Box paddingBlockStart="300">
                <Button variant="primary" url={`/store/${slug}/customers/new`}>
                  Add customer
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
              sortOptions={SORT_OPTIONS}
              sortSelected={sort}
              onSort={(value) => {
                setSort(value);
                resetPaging();
              }}
              onClearAll={() => {
                setQuery('');
                resetPaging();
              }}
              mode={mode}
              setMode={setMode}
              cancelAction={{ onAction: () => setQuery('') }}
              loading={customers.isFetching}
              canCreateNewView={false}
            />

            <IndexTable
              resourceName={{ singular: 'customer', plural: 'customers' }}
              itemCount={rows.length}
              selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: 'Customer' },
                { title: 'Email subscription' },
                { title: 'Orders' },
                { title: 'Amount spent' },
              ]}
              promotedBulkActions={[
                { content: 'Delete customers', onAction: () => setConfirmingDelete(true) },
              ]}
              pagination={{
                hasPrevious: cursorStack.length > 0,
                hasNext: Boolean(customers.data?.nextCursor),
                onPrevious: () => setCursorStack((stack) => stack.slice(0, -1)),
                onNext: () => {
                  const next = customers.data?.nextCursor;
                  if (next) setCursorStack((stack) => [...stack, next]);
                },
              }}
              emptyState={
                <Box padding="800">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="h2" variant="headingMd">
                      {segmentEmpty?.heading ?? 'No customers found'}
                    </Text>
                    <Text as="p" tone="subdued" alignment="center">
                      {segmentEmpty?.body ?? 'Try changing the search or filters.'}
                    </Text>
                  </BlockStack>
                </Box>
              }
            >
              {rows.map((customer, index) => (
                <IndexTable.Row
                  id={customer.id}
                  key={customer.id}
                  position={index}
                  selected={selectedResources.includes(customer.id)}
                  onClick={() => router.push(`/store/${slug}/customers/${customer.id}`)}
                >
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {customerName(customer)}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {customer.acceptsMarketing ? (
                      <Badge tone="success">Subscribed</Badge>
                    ) : (
                      <Badge>Not subscribed</Badge>
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {customer.ordersCount === 1 ? '1 order' : `${customer.ordersCount} orders`}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{format(customer.totalSpent)}</IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </>
        )}
      </Card>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${selectedResources.length} customer${selectedResources.length === 1 ? '' : 's'}?`}
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: bulkBusy,
          onAction: deleteSelected,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This can’t be undone. Orders these customers already placed keep their details.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
