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
  BlockStack,
  Box,
  Card,
  ChoiceList,
  IndexFilters,
  IndexTable,
  InlineStack,
  Page,
  Text,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { OrderIcon } from '@shopify/polaris-icons';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LearnMore } from '../../../../components/shell/learn-more.tsx';
import { PageHeader } from '../../../../components/shell/page-header.tsx';
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

/**
 * The two filter popovers Shopify puts on this index, mapped onto C2's
 * `financialStatus` / `fulfillmentStatus` query parameters.
 *
 * `satisfies Record<...>` is doing real work: it makes a typo or a status the
 * enum grows later a typecheck failure rather than a filter that quietly sends
 * a value the API rejects, or one that can never be selected. The labels are
 * Shopify's filter-list wording, which is not always the badge wording — the
 * `pending` badge reads "Payment pending", but under a heading that already
 * says "Payment status" the option is just "Pending".
 *
 * Single-select, because the API takes one value per parameter; a
 * checkbox list that honoured only the last box would be a lying control.
 */
const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  authorized: 'Authorized',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  voided: 'Voided',
} satisfies Record<OrderSummary['financialStatus'], string>;

const FULFILLMENT_STATUS_LABELS = {
  unfulfilled: 'Unfulfilled',
  partially_fulfilled: 'Partially fulfilled',
  fulfilled: 'Fulfilled',
} satisfies Record<OrderSummary['fulfillmentStatus'], string>;

function toChoices(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const PAYMENT_STATUS_CHOICES = toChoices(PAYMENT_STATUS_LABELS);
const FULFILLMENT_STATUS_CHOICES = toChoices(FULFILLMENT_STATUS_LABELS);

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
  const [paymentStatus, setPaymentStatus] = useState<string[]>([]);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string[]>([]);
  const [sort, setSort] = useState<string[]>(['createdAt desc']);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const selectedTab = TABS[tab]?.tab ?? 'all';
  const [sortKey, sortOrder] = (sort[0] ?? 'createdAt desc').split(' ');

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE), tab: selectedTab });
    if (query.trim() !== '') search.set('query', query.trim());
    if (paymentStatus[0]) search.set('financialStatus', paymentStatus[0]);
    if (fulfillmentStatus[0]) search.set('fulfillmentStatus', fulfillmentStatus[0]);
    if (sortKey) search.set('sortKey', sortKey);
    if (sortOrder) search.set('sortOrder', sortOrder);
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/orders?${search.toString()}`;
  }, [selectedTab, query, paymentStatus, fulfillmentStatus, sortKey, sortOrder, cursor]);

  const orders = useApiQuery<Paginated<OrderSummary>>(['orders', path], path, {
    keepPreviousData: true,
  });
  const rows = orders.data?.data ?? [];

  const resetPaging = () => setCursorStack([]);

  const clearFilters = () => {
    setQuery('');
    setPaymentStatus([]);
    setFulfillmentStatus([]);
    resetPaging();
  };

  /** One removable pill per active filter — Shopify's "Payment status: Paid". */
  const appliedFilters = [
    {
      key: 'financialStatus',
      title: 'Payment status',
      value: paymentStatus[0],
      options: PAYMENT_STATUS_CHOICES,
      clear: () => setPaymentStatus([]),
    },
    {
      key: 'fulfillmentStatus',
      title: 'Fulfillment status',
      value: fulfillmentStatus[0],
      options: FULFILLMENT_STATUS_CHOICES,
      clear: () => setFulfillmentStatus([]),
    },
  ].flatMap(({ key, title, value, options, clear }) =>
    value
      ? [
          {
            key,
            label: `${title}: ${options.find((option) => option.value === value)?.label ?? value}`,
            onRemove: () => {
              clear();
              resetPaging();
            },
          },
        ]
      : [],
  );

  if (orders.isPending) return <PageSkeleton fullWidth />;

  // The illustrated "no orders yet" state is only honest when nothing is
  // narrowing the list; a filter that matched nothing gets the table's quiet
  // no-match state instead (docs/parity/index-tables.md, empty-state kind C).
  const unfiltered =
    selectedTab === 'all' &&
    query.trim() === '' &&
    paymentStatus.length === 0 &&
    fulfillmentStatus.length === 0 &&
    cursorStack.length === 0;

  return (
    <Page fullWidth>
      <BlockStack gap="400">
        {/* No header action: the real Orders index offers only `More actions`,
            and every entry in it is out of scope (docs/parity/admin-shell.md). */}
        <PageHeader icon={OrderIcon} title="Orders" />

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
                filters={[
                  {
                    key: 'financialStatus',
                    label: 'Payment status',
                    // `pinned`, not `shortcut`: IndexFilters' FiltersBar only
                    // reads `pinned` (Polaris 13.9.5 — `shortcut` is LegacyFilters'
                    // prop), and an unpinned filter is buried behind "Add filter"
                    // instead of sitting on the bar as Shopify's pill.
                    pinned: true,
                    filter: (
                      <ChoiceList
                        title="Payment status"
                        titleHidden
                        choices={PAYMENT_STATUS_CHOICES}
                        selected={paymentStatus}
                        onChange={(selected) => {
                          setPaymentStatus(selected);
                          resetPaging();
                        }}
                      />
                    ),
                  },
                  {
                    key: 'fulfillmentStatus',
                    label: 'Fulfillment status',
                    pinned: true,
                    filter: (
                      <ChoiceList
                        title="Fulfillment status"
                        titleHidden
                        choices={FULFILLMENT_STATUS_CHOICES}
                        selected={fulfillmentStatus}
                        onChange={(selected) => {
                          setFulfillmentStatus(selected);
                          resetPaging();
                        }}
                      />
                    ),
                  },
                ]}
                appliedFilters={appliedFilters}
                onClearAll={clearFilters}
                mode={mode}
                setMode={setMode}
                // Leaving filtering mode has to clear the filters, not just the
                // search: Default mode renders no pills, so a kept filter would
                // silently hold rows back with nothing on screen saying why.
                cancelAction={{ onAction: clearFilters }}
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

        <LearnMore resource="orders" />
      </BlockStack>
    </Page>
  );
}
