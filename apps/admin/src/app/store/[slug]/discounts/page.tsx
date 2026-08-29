'use client';

/**
 * Discounts index (PARITY.md → Index pages). Owner: WS-C (C6).
 *
 * The primary action is Shopify's split menu: "Create discount" opens a choice
 * of the three types rather than a blank form, because the type decides which
 * fields the form even shows.
 *
 * Status is derived server-side from the date window (there is no cron), so the
 * badge here is whatever the API says and never a second implementation of it.
 */
import type { Paginated } from '@merchant/contracts/common';
import type { Discount } from '@merchant/contracts/discounts';
import {
  ActionList,
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  IndexFilters,
  IndexTable,
  Page,
  Popover,
  Text,
  useSetIndexFiltersMode,
} from '@shopify/polaris';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../lib/api.ts';

const PAGE_SIZE = 50;

const TABS = [
  { label: 'All', status: undefined },
  { label: 'Active', status: 'active' },
  { label: 'Scheduled', status: 'scheduled' },
  { label: 'Expired', status: 'expired' },
] as const;

/**
 * A tab that is empty on its own terms gets a sentence that explains why, not
 * "try changing the filters" — the merchant has not filtered anything.
 */
const TAB_EMPTY: Record<string, { heading: string; body: string }> = {
  active: {
    heading: 'No active discounts',
    body: 'Discounts that are running right now show up here.',
  },
  scheduled: {
    heading: 'No scheduled discounts',
    body: 'Give a discount a future start date and it waits here until then.',
  },
  expired: {
    heading: 'No expired discounts',
    body: 'Discounts show up here once their end date has passed.',
  },
};

/** The words Shopify puts in the Type column. */
const TYPE_LABELS: Record<Discount['type'], string> = {
  amount_off_order: 'Amount off order',
  amount_off_products: 'Amount off products',
  free_shipping: 'Free shipping',
};

/** PARITY.md badge table: Active success, Scheduled attention, Expired default. */
function StatusBadge({ status }: { status: Discount['status'] }) {
  if (status === 'active') return <Badge tone="success">Active</Badge>;
  if (status === 'scheduled') return <Badge tone="attention">Scheduled</Badge>;
  if (status === 'disabled') return <Badge>Disabled</Badge>;
  return <Badge>Expired</Badge>;
}

export default function DiscountsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const { mode, setMode } = useSetIndexFiltersMode();

  const cursor = cursorStack.at(-1);
  const status = TABS[tab]?.status;

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (status) search.set('status', status);
    if (query.trim() !== '') search.set('query', query.trim());
    if (cursor) search.set('cursor', cursor);
    return `/admin/api/discounts?${search.toString()}`;
  }, [status, query, cursor]);

  const discounts = useApiQuery<Paginated<Discount>>(['discounts', path], path, {
    keepPreviousData: true,
  });
  const rows = discounts.data?.data ?? [];

  const resetPaging = () => setCursorStack([]);
  const createUrl = (type: Discount['type']) => `/store/${slug}/discounts/new?type=${type}`;

  if (discounts.isPending) return <PageSkeleton fullWidth primaryAction />;

  const empty = rows.length === 0 && query.trim() === '' && !status && cursorStack.length === 0;

  // An unfiltered tab that is simply empty explains itself; a search that found
  // nothing gets the "change the filters" line instead.
  const tabEmpty = query.trim() === '' && status ? TAB_EMPTY[status] : undefined;

  const createMenu = (
    <Popover
      active={createOpen}
      onClose={() => setCreateOpen(false)}
      activator={
        <Button variant="primary" disclosure onClick={() => setCreateOpen((open) => !open)}>
          Create discount
        </Button>
      }
    >
      <ActionList
        actionRole="menuitem"
        items={(Object.keys(TYPE_LABELS) as Discount['type'][]).map((type) => ({
          content: TYPE_LABELS[type],
          onAction: () => {
            setCreateOpen(false);
            router.push(createUrl(type));
          },
        }))}
      />
    </Popover>
  );

  return (
    <Page title="Discounts" primaryAction={createMenu} fullWidth>
      <Card padding="0">
        {empty ? (
          <Box padding="800">
            <BlockStack gap="200" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Manage discounts and promotions
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Create discount codes and automatic discounts that apply at checkout.
              </Text>
              <Box paddingBlockStart="300">{createMenu}</Box>
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
              loading={discounts.isFetching}
              canCreateNewView={false}
            />

            <IndexTable
              resourceName={{ singular: 'discount', plural: 'discounts' }}
              itemCount={rows.length}
              // Orders precedent (DECISIONS.md): no selection checkboxes —
              // the API has no bulk discount actions.
              selectable={false}
              headings={[
                { title: 'Title' },
                { title: 'Status' },
                { title: 'Method' },
                { title: 'Type' },
                { title: 'Used' },
              ]}
              pagination={{
                hasPrevious: cursorStack.length > 0,
                hasNext: Boolean(discounts.data?.nextCursor),
                onPrevious: () => setCursorStack((stack) => stack.slice(0, -1)),
                onNext: () => {
                  const next = discounts.data?.nextCursor;
                  if (next) setCursorStack((stack) => [...stack, next]);
                },
              }}
              emptyState={
                <Box padding="800">
                  <BlockStack gap="200" inlineAlign="center">
                    <Text as="h2" variant="headingMd">
                      {tabEmpty?.heading ?? 'No discounts found'}
                    </Text>
                    <Text as="p" tone="subdued" alignment="center">
                      {tabEmpty?.body ?? 'Try changing the search or filters.'}
                    </Text>
                  </BlockStack>
                </Box>
              }
            >
              {rows.map((discount, index) => (
                <IndexTable.Row
                  id={discount.id}
                  key={discount.id}
                  position={index}
                  onClick={() => router.push(`/store/${slug}/discounts/${discount.id}`)}
                >
                  <IndexTable.Cell>
                    <BlockStack gap="050">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {discount.code ?? discount.title}
                      </Text>
                      <Text as="span" tone="subdued" variant="bodySm">
                        {discount.title}
                      </Text>
                    </BlockStack>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <StatusBadge status={discount.status} />
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {discount.code ? 'Code' : 'Automatic'}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {TYPE_LABELS[discount.type]}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {discount.usageLimit
                        ? `${discount.usedCount} of ${discount.usageLimit} used`
                        : `${discount.usedCount} used`}
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
