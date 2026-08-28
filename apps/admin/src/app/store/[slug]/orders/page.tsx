'use client';

/**
 * Orders index (PARITY.md → Index pages). Owner: WS-C (C5).
 *
 * Same anatomy as the products index: title → card with tabs, filter row,
 * IndexTable, pagination. The tabs are Shopify's own — All, Unfulfilled,
 * Unpaid, Open, Closed — and map straight onto C2's `?tab=`.
 *
 * There is no "Create order" primary action: draft orders are out of scope
 * (SPEC §2), and a button that 404s is worse than no button (CLAUDE.md §8).
 */
import { format } from '@merchant/config/money';
import type { Paginated } from '@merchant/contracts/common';
import type { OrderSummary } from '@merchant/contracts/orders';
import {
  Box,
  Card,
  IndexFilters,
  IndexTable,
  InlineStack,
  Page,
  Text,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../lib/api.ts';
import { CancelledBadge, FinancialBadge, FulfillmentBadge } from './_components/order-badges.tsx';

const PAGE_SIZE = 50;

/** Shopify's order tabs, in Shopify's order. `tab` is C2's query parameter. */
const TABS = [
  { label: 'All', tab: 'all' },
  { label: 'Unfulfilled', tab: 'unfulfilled' },
  { label: 'Unpaid', tab: 'unpaid' },
  { label: 'Open', tab: 'open' },
  { label: 'Closed', tab: 'closed' },
] as const;

const SORT_OPTIONS = [
  { label: 'Date', value: 'createdAt desc' as const, directionLabel: 'Newest first' },
  { label: 'Date', value: 'createdAt asc' as const, directionLabel: 'Oldest first' },
  { label: 'Order number', value: 'orderNumber desc' as const, directionLabel: 'Highest first' },
  { label: 'Order number', value: 'orderNumber asc' as const, directionLabel: 'Lowest first' },
  { label: 'Total', value: 'total desc' as const, directionLabel: 'Highest first' },
  { label: 'Total', value: 'total asc' as const, directionLabel: 'Lowest first' },
];

/** "May 3 at 2:14 pm" — Shopify's order-row date format. */
function orderDate(iso: string): string {
  return new Date(iso)
    .toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    .replace(',', ' at');
}

/**
 * Shopify's Customer column shows a name. A guest order has no customer row,
 * and a customer can exist with neither name set, so the email stays the
 * fallback rather than rendering an empty cell.
 */
function customerName(order: OrderSummary): string {
  const full = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ');
  return full || order.email;
}

export default function OrdersPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<string[]>(['createdAt desc']);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const selectedTab = TABS[tab]?.tab ?? 'all';
  const [sortKey, sortOrder] = (sort[0] ?? 'createdAt desc').split(' ');

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE), tab: selectedTab });
    if (query.trim() !== '') search.set('query', query.trim());
    if (sortKey) search.set('sortKey', sortKey);
    if (sortOrder) search.set('sortOrder', sortOrder);
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/orders?${search.toString()}`;
  }, [selectedTab, query, sortKey, sortOrder, cursor]);

  const orders = useApiQuery<Paginated<OrderSummary>>(['orders', path], path);
  const rows = orders.data?.data ?? [];

  const resetPaging = () => setCursorStack([]);

  if (orders.isPending) return <PageSkeleton />;

  const unfiltered = selectedTab === 'all' && query.trim() === '' && cursorStack.length === 0;

  return (
    <Page title="Orders" fullWidth>
      <Card padding="0">
        {rows.length === 0 && unfiltered ? (
          // Hand-built rather than Polaris `EmptyState`, which needs an `image`
          // — the only on-brand illustrations are Shopify's own CDN assets and
          // PARITY.md forbids rendering those (same call B5 and A3 made).
          <Box padding="800">
            <div style={{ textAlign: 'center' }}>
              <Text as="h2" variant="headingMd">
                Your orders will show up here
              </Text>
              <Box paddingBlockStart="200">
                <Text as="p" tone="subdued">
                  Once a customer checks out, their order appears in this list.
                </Text>
              </Box>
            </div>
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
              sortOptions={SORT_OPTIONS}
              sortSelected={sort}
              onSort={(value) => {
                setSort(value);
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
              loading={orders.isFetching}
              canCreateNewView={false}
            />

            <IndexTable
              resourceName={{ singular: 'order', plural: 'orders' }}
              itemCount={rows.length}
              selectable={false}
              headings={[
                { title: 'Order' },
                { title: 'Date' },
                { title: 'Customer' },
                { title: 'Total', alignment: 'end' },
                { title: 'Payment' },
                { title: 'Fulfillment' },
                { title: 'Items' },
              ]}
              pagination={{
                hasPrevious: cursorStack.length > 0,
                hasNext: Boolean(orders.data?.nextCursor),
                onPrevious: () => setCursorStack((stack) => stack.slice(0, -1)),
                onNext: () => {
                  const next = orders.data?.nextCursor;
                  if (next) setCursorStack((stack) => [...stack, next]);
                },
              }}
              emptyState={
                <div style={{ padding: 'var(--p-space-800)', textAlign: 'center' }}>
                  <Text as="p" tone="subdued">
                    No orders found. Try changing the search or filters.
                  </Text>
                </div>
              }
            >
              {rows.map((order, index) => (
                <IndexTable.Row
                  id={order.id}
                  key={order.id}
                  position={index}
                  onClick={() => router.push(`/store/${slug}/orders/${order.id}`)}
                >
                  <IndexTable.Cell>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      #{order.orderNumber}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {orderDate(order.createdAt)}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{customerName(order)}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" alignment="end" numeric>
                      {format(order.total)}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <InlineStack gap="150">
                      {order.cancelledAt ? <CancelledBadge /> : null}
                      <FinancialBadge order={order} />
                    </InlineStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <FulfillmentBadge order={order} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {order.lineItems.reduce((sum, line) => sum + line.quantity, 0)} items
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </>
        )}
      </Card>
    </Page>
  );
}
