'use client';

/**
 * Webhook delivery log for one app (SPEC §13, G4). Owner: WS-G.
 *
 * Newest first, because the row a merchant came here to read is the one from
 * ten seconds ago. `lastError` is the whole reason this table exists — it hides
 * behind a popover rather than being truncated into a cell, since a Node stack
 * trace or a 502 body is unreadable at column width but decisive at full width.
 */
import type { AppDelivery } from '@merchant/contracts/apps';
import type { Paginated } from '@merchant/contracts/common';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Popover,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useMemo, useState } from 'react';
import { useApiQuery } from '../../../../lib/api.ts';
import { formatDateTime, topicLabel } from './format.ts';
import { useCursorPaging } from './use-cursor-paging.ts';

/** SPEC §5: admin tables page at 50. */
const PAGE_SIZE = 50;

/** Status → badge, per the delivery states the contract defines. */
function StatusBadge({ status }: { status: AppDelivery['status'] }) {
  if (status === 'success') return <Badge tone="success">Delivered</Badge>;
  if (status === 'pending') return <Badge tone="attention">Pending</Badge>;
  if (status === 'failed') return <Badge tone="critical">Failed</Badge>;
  return <Badge tone="critical">Exhausted</Badge>;
}

function ErrorCell({ delivery }: { delivery: AppDelivery }) {
  const [open, setOpen] = useState(false);

  if (!delivery.lastError) {
    return (
      <Text as="span" tone="subdued">
        —
      </Text>
    );
  }

  return (
    <Popover
      active={open}
      onClose={() => setOpen(false)}
      preferredAlignment="right"
      activator={
        <Button variant="plain" tone="critical" disclosure onClick={() => setOpen((was) => !was)}>
          View error
        </Button>
      }
    >
      <Box padding="400" maxWidth="380px">
        <BlockStack gap="100">
          <Text as="h4" variant="headingXs">
            Last error
          </Text>
          <Text as="p" breakWord>
            {delivery.lastError}
          </Text>
        </BlockStack>
      </Box>
    </Popover>
  );
}

export function DeliveryLog({ appId, refreshKey }: { appId: string; refreshKey: number }) {
  const paging = useCursorPaging();

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (paging.cursor) search.set('cursor', paging.cursor);
    return `/admin/api/apps/${appId}/deliveries?${search.toString()}`;
  }, [appId, paging.cursor]);

  // `refreshKey` is part of the cache key rather than a manual refetch: a test
  // event bumps it, and React Query then treats the new page as a fresh query
  // instead of serving the stale one it already has.
  const deliveries = useApiQuery<Paginated<AppDelivery>>(
    ['app', appId, 'deliveries', path, refreshKey],
    path,
  );
  const rows = deliveries.data?.data ?? [];

  return (
    <Card padding="0">
      <Box padding="400" paddingBlockEnd="300">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="050">
            <Text as="h2" variant="headingMd">
              Recent deliveries
            </Text>
            <Text as="p" tone="subdued">
              Every attempt we made to reach this app’s endpoints, newest first.
            </Text>
          </BlockStack>
          <Button
            icon={RefreshIcon}
            loading={deliveries.isFetching}
            onClick={() => void deliveries.refetch()}
            accessibilityLabel="Refresh deliveries"
          />
        </InlineStack>
      </Box>

      {deliveries.isPending ? (
        <Box padding="400">
          <SkeletonBodyText lines={4} />
        </Box>
      ) : rows.length === 0 && !paging.hasPrevious ? (
        <Box padding="500">
          <BlockStack gap="150" inlineAlign="center">
            <Text as="p" fontWeight="semibold">
              No deliveries yet
            </Text>
            <Text as="p" tone="subdued" alignment="center">
              Subscribe to an event and send a test — attempts show up here with their response.
            </Text>
          </BlockStack>
        </Box>
      ) : (
        <IndexTable
          resourceName={{ singular: 'delivery', plural: 'deliveries' }}
          itemCount={rows.length}
          selectable={false}
          loading={deliveries.isFetching}
          headings={[
            { title: 'Event' },
            { title: 'Status' },
            { title: 'Attempts' },
            { title: 'Response' },
            { title: 'Error' },
            { title: 'Date' },
          ]}
          pagination={{
            hasPrevious: paging.hasPrevious,
            hasNext: Boolean(deliveries.data?.nextCursor),
            onPrevious: paging.previous,
            onNext: () => {
              const next = deliveries.data?.nextCursor;
              if (next) paging.next(next);
            },
          }}
        >
          {rows.map((delivery, index) => (
            <IndexTable.Row id={delivery.id} key={delivery.id} position={index}>
              <IndexTable.Cell>
                <BlockStack gap="025">
                  <Text as="span" fontWeight="semibold">
                    {topicLabel(delivery.topic)}
                  </Text>
                  <Text as="span" tone="subdued">
                    {delivery.topic}
                  </Text>
                </BlockStack>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <StatusBadge status={delivery.status} />
              </IndexTable.Cell>
              <IndexTable.Cell>{delivery.attempts}</IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" tone={deliveryFailed(delivery) ? 'critical' : 'subdued'}>
                  {delivery.responseStatus ?? '—'}
                </Text>
              </IndexTable.Cell>
              <IndexTable.Cell>
                <ErrorCell delivery={delivery} />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Text as="span" tone="subdued">
                  {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
                </Text>
              </IndexTable.Cell>
            </IndexTable.Row>
          ))}
        </IndexTable>
      )}
    </Card>
  );
}

function deliveryFailed(delivery: AppDelivery): boolean {
  return delivery.status === 'failed' || delivery.status === 'exhausted';
}
