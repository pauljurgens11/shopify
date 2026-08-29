'use client';

/**
 * Apps index (PARITY.md → Index pages). Owner: WS-G (G4).
 *
 * Private apps only — no app store, no OAuth. Each row is one Admin API token,
 * so the columns answer the questions a merchant has about a credential: what
 * can it reach, which token is it, and is anything still using it.
 */
import type { App } from '@merchant/contracts/apps';
import type { Paginated } from '@merchant/contracts/common';
import { BlockStack, Box, Button, Card, IndexTable, Page, Text } from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { useApiQuery } from '../../../../lib/api.ts';
import { CreateAppModal } from './create-app-modal.tsx';
import { formatDate, formatDateTime, mask } from './format.ts';
import { stashSecret } from './revealed-secrets.ts';
import { scopeCountLabel } from './scopes.ts';
import { useCursorPaging } from './use-cursor-paging.ts';

const PAGE_SIZE = 50;

export default function AppsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState(false);
  const paging = useCursorPaging();

  const path = useMemo(() => {
    const search = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (paging.cursor) search.set('cursor', paging.cursor);
    return `/admin/api/apps?${search.toString()}`;
  }, [paging.cursor]);

  const apps = useApiQuery<Paginated<App>>(['apps', path], path, { keepPreviousData: true });
  const rows = apps.data?.data ?? [];

  if (apps.isPending) return <PageSkeleton fullWidth />;

  const empty = rows.length === 0 && !paging.hasPrevious;

  return (
    <Page
      title="Apps"
      primaryAction={{ content: 'Create app', onAction: () => setCreating(true) }}
      fullWidth
    >
      <Card padding="0">
        {empty ? (
          // Hand-built rather than Polaris `EmptyState`, which requires an
          // `image`: the only on-brand illustrations are Shopify's own CDN
          // assets, and PARITY.md forbids rendering those (A3 hit the same wall).
          <Box padding="800">
            <BlockStack gap="200" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Connect your store to your own tools
              </Text>
              <Box maxWidth="52ch">
                <Text as="p" tone="subdued" alignment="center">
                  An app is an Admin API token with the access scopes you choose. Use one to sync
                  products from a spreadsheet, push orders into your warehouse, or subscribe an
                  endpoint to webhooks.
                </Text>
              </Box>
              <Box paddingBlockStart="300">
                <Button variant="primary" onClick={() => setCreating(true)}>
                  Create app
                </Button>
              </Box>
            </BlockStack>
          </Box>
        ) : (
          <IndexTable
            resourceName={{ singular: 'app', plural: 'apps' }}
            itemCount={rows.length}
            // Nothing here is a bulk operation — uninstalling a credential is a
            // one-at-a-time, confirm-it decision on the detail page.
            selectable={false}
            loading={apps.isFetching}
            headings={[
              { title: 'App' },
              { title: 'Access scopes' },
              { title: 'API token' },
              { title: 'Last used' },
              { title: 'Date created' },
            ]}
            pagination={{
              hasPrevious: paging.hasPrevious,
              hasNext: Boolean(apps.data?.nextCursor),
              onPrevious: paging.previous,
              onNext: () => {
                const next = apps.data?.nextCursor;
                if (next) paging.next(next);
              },
            }}
          >
            {rows.map((app, index) => (
              <IndexTable.Row
                id={app.id}
                key={app.id}
                position={index}
                onClick={() => router.push(`/store/${slug}/apps/${app.id}`)}
              >
                <IndexTable.Cell>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {app.name}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" tone="subdued">
                    {scopeCountLabel(app.scopes)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" tone="subdued">
                    {mask(app.tokenSuffix)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" tone="subdued">
                    {app.lastUsedAt ? formatDateTime(app.lastUsedAt) : 'Never'}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{formatDate(app.createdAt)}</IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>

      <CreateAppModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(app, apiToken) => {
          // The plaintext exists nowhere else after this response, so hand it to
          // the detail page out-of-band and go there to reveal it.
          stashSecret(app.id, apiToken);
          void queryClient.invalidateQueries({ queryKey: ['apps'] });
          toast.show('App created');
          router.push(`/store/${slug}/apps/${app.id}`);
        }}
      />
    </Page>
  );
}
