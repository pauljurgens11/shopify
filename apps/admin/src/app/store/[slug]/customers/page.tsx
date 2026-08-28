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
  BlockStack,
  Box,
  Button,
  Card,
  IndexFilters,
  IndexTable,
  Page,
  Text,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../lib/api.ts';

const PAGE_SIZE = 50;

/** Shopify's customer segment tabs, in Shopify's order. */
const TABS = [
  { label: 'All', segment: undefined },
  { label: 'New', segment: 'new' },
  { label: 'Returning', segment: 'returning' },
  { label: 'Abandoned checkouts', segment: 'abandoned-checkout' },
] as const;

function customerName(customer: Customer): string {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return name === '' ? customer.email : name;
}

export default function CustomersPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const segment = TABS[tab]?.segment;

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (segment) search.set('segment', segment);
    if (query.trim() !== '') search.set('query', query.trim());
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/customers?${search.toString()}`;
  }, [segment, query, cursor]);

  const customers = useApiQuery<Paginated<Customer>>(['customers', path], path);
  const rows = customers.data?.data ?? [];

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(
    rows as unknown as Array<{ [key: string]: unknown; id: string }>,
  );

  const resetPaging = () => setCursorStack([]);

  if (customers.isPending) return <PageSkeleton />;

  const empty = rows.length === 0 && query.trim() === '' && !segment && cursorStack.length === 0;

  return (
    <Page
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
                <div style={{ padding: 'var(--p-space-800)', textAlign: 'center' }}>
                  <Text as="p" tone="subdued">
                    No customers found. Try changing the search or filters.
                  </Text>
                </div>
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
    </Page>
  );
}
