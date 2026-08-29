'use client';

/**
 * Fulfil items (SPEC §9, C5). Owner: WS-C.
 *
 * Quantity per line defaults to what is left to ship. The location select is
 * required — C3 moves stock at a location, and guessing one silently would
 * decrement the wrong warehouse.
 */
import type { Location } from '@merchant/contracts/locations';
import type { OrderDetail } from '@merchant/contracts/orders';
import {
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ImageIcon, OrderIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageBreadcrumb } from '../../../../../../components/shell/page-breadcrumb.tsx';
import { PageSkeleton } from '../../../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../../lib/api.ts';
import { remainingToFulfil } from '../../_components/status.ts';

export default function FulfillPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const order = useApiQuery<OrderDetail>(['order', id], `/admin/api/orders/${id}`);
  const locations = useApiQuery<{ data: Location[] }>(['locations'], '/admin/api/locations');

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [locationId, setLocationId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Default every line to what is still owed, once the order arrives.
  useEffect(() => {
    if (!order.data) return;
    setQuantities((current) =>
      Object.keys(current).length > 0
        ? current
        : Object.fromEntries(
            order.data.lineItems.map((line) => [line.id, String(remainingToFulfil(line))]),
          ),
    );
  }, [order.data]);

  useEffect(() => {
    const first = locations.data?.data[0];
    if (first && !locationId) setLocationId(first.id);
  }, [locations.data, locationId]);

  if (order.isPending || locations.isPending) return <PageSkeleton layout="detail" />;
  const detail = order.data;
  // A bare `return null` here paints a blank white page, which reads as a
  // crash rather than a missing order.
  if (!detail) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageBreadcrumb
            icon={OrderIcon}
            title="Fulfill items"
            backUrl={`/store/${slug}/orders`}
            backLabel={'Orders'}
          />
          <Card>
            <Text as="p">{order.error?.message ?? 'This order could not be found.'}</Text>
          </Card>
        </BlockStack>
      </Page>
    );
  }

  const fulfillable = detail.lineItems.filter((line) => remainingToFulfil(line) > 0);
  const lineItems = fulfillable
    .map((line) => ({ lineItemId: line.id, quantity: Number(quantities[line.id] ?? 0) }))
    .filter((entry) => entry.quantity > 0);
  const totalUnits = lineItems.reduce((sum, entry) => sum + entry.quantity, 0);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/api/orders/${id}/fulfillments`, {
        method: 'POST',
        // No `notifyCustomer`: no shipping-notification job exists, so the
        // checkbox promising one was cut with its UI (CLAUDE.md §8). The
        // contract field is optional and simply goes unsent.
        body: {
          locationId,
          lineItems,
          ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
          ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['open-orders-count'] });
      toast.show('Items fulfilled');
      router.push(`/store/${slug}/orders/${id}`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageBreadcrumb
        icon={OrderIcon}
        backUrl={`/store/${slug}/orders/${id}`}
        backLabel={`#${detail.orderNumber}`}
        title={`Fulfill items · #${detail.orderNumber}`}
      />

      <Box paddingBlockStart="400">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Unfulfilled items
                </Text>
                {fulfillable.length === 0 ? (
                  <Text as="p" tone="subdued">
                    Everything on this order has already shipped.
                  </Text>
                ) : (
                  fulfillable.map((line) => {
                    const max = remainingToFulfil(line);
                    return (
                      <InlineStack
                        key={line.id}
                        align="space-between"
                        blockAlign="center"
                        gap="400"
                      >
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                          <Thumbnail
                            source={line.imageUrl ?? ImageIcon}
                            alt={line.title}
                            size="small"
                          />
                          <BlockStack gap="050">
                            <Text as="span" variant="bodyMd" fontWeight="medium">
                              {line.title}
                            </Text>
                            {line.variantTitle ? (
                              <Text as="span" variant="bodySm" tone="subdued">
                                {line.variantTitle}
                              </Text>
                            ) : null}
                          </BlockStack>
                        </InlineStack>
                        <InlineStack gap="200" blockAlign="center">
                          <div style={{ width: 80 }}>
                            <TextField
                              label="Quantity"
                              labelHidden
                              type="number"
                              min={0}
                              max={max}
                              autoComplete="off"
                              value={quantities[line.id] ?? '0'}
                              onChange={(value) =>
                                setQuantities((current) => ({ ...current, [line.id]: value }))
                              }
                            />
                          </div>
                          <Text as="span" tone="subdued">
                            of {max}
                          </Text>
                        </InlineStack>
                      </InlineStack>
                    );
                  })
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Location
                  </Text>
                  <Select
                    label="Fulfil from"
                    labelHidden
                    options={(locations.data?.data ?? []).map((location) => ({
                      label: location.name,
                      value: location.id,
                    }))}
                    value={locationId}
                    onChange={setLocationId}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Tracking
                  </Text>
                  <TextField
                    label="Tracking number"
                    autoComplete="off"
                    value={trackingNumber}
                    onChange={setTrackingNumber}
                  />
                  <TextField
                    label="Tracking URL"
                    autoComplete="off"
                    placeholder="https://"
                    value={trackingUrl}
                    onChange={setTrackingUrl}
                  />
                </BlockStack>
              </Card>

              <Button
                variant="primary"
                size="large"
                fullWidth
                loading={saving}
                disabled={totalUnits === 0 || !locationId}
                onClick={() => void submit()}
              >
                {totalUnits === 0
                  ? 'Fulfill items'
                  : `Fulfill ${totalUnits} item${totalUnits === 1 ? '' : 's'}`}
              </Button>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Box>
    </Page>
  );
}
