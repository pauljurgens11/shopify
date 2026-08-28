'use client';

/**
 * Order detail (PARITY.md → Order detail). Owner: WS-C (C5).
 *
 * Shopify's three zones: header with the order number, date and status badges;
 * left column of fulfillment / payment / timeline cards; right column of
 * notes, customer and addresses.
 *
 * Out of scope and deliberately not rendered (SPEC §2): order editing,
 * duplicate, print. A button that cannot work is worse than none (CLAUDE.md §8).
 */
import type { AddressDto } from '@merchant/contracts/common';
import type { OrderDetail } from '@merchant/contracts/orders';
import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Link,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { LineItemsCards } from '../_components/line-items-card.tsx';
import { CancelledBadge, FinancialBadge, FulfillmentBadge } from '../_components/order-badges.tsx';
import { PaymentCard } from '../_components/payment-card.tsx';
import { Timeline } from '../_components/timeline.tsx';

const CANCEL_REASONS = [
  { label: 'Customer changed or cancelled order', value: 'customer' },
  { label: 'Fraudulent order', value: 'fraud' },
  { label: 'Items unavailable', value: 'inventory' },
  { label: 'Payment declined', value: 'declined' },
  { label: 'Other', value: 'other' },
];

function AddressBlock({ address }: { address: AddressDto | null }) {
  if (!address) {
    return (
      <Text as="p" variant="bodySm" tone="subdued">
        No address provided
      </Text>
    );
  }
  const lines = [
    [address.firstName, address.lastName].filter(Boolean).join(' '),
    address.company,
    address.address1,
    address.address2,
    [address.city, address.province, address.zip].filter(Boolean).join(' '),
    address.country,
    address.phone,
  ].filter((line): line is string => Boolean(line?.trim()));

  return (
    <BlockStack gap="050">
      {lines.map((line) => (
        <Text key={line} as="p" variant="bodySm" tone="subdued">
          {line}
        </Text>
      ))}
    </BlockStack>
  );
}

export default function OrderDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const _router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('customer');
  const [cancelling, setCancelling] = useState(false);
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const query = useApiQuery<OrderDetail>(['order', id], `/admin/api/orders/${id}`);
  const order = query.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['order', id] });

  if (query.isPending) return <PageSkeleton />;
  if (!order) {
    return (
      <Page title="Order" backAction={{ content: 'Orders', url: `/store/${slug}/orders` }}>
        <Card>
          <Text as="p">{query.error?.message ?? 'This order could not be found.'}</Text>
        </Card>
      </Page>
    );
  }

  const placed = new Date(order.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  /** Shopify disables Cancel once money has been captured. */
  const paid = order.financialStatus === 'paid' || order.financialStatus === 'partially_refunded';
  const alreadyCancelled = Boolean(order.cancelledAt);

  const postComment = async (message: string) => {
    setPosting(true);
    try {
      await apiFetch(`/admin/api/orders/${id}/events`, { method: 'POST', body: { message } });
      await refresh();
    } catch (cause) {
      toast.error((cause as ApiError).message);
      throw cause;
    } finally {
      setPosting(false);
    }
  };

  const saveNote = async () => {
    if (note === null) return;
    setSavingNote(true);
    try {
      await apiFetch(`/admin/api/orders/${id}`, { method: 'PATCH', body: { note } });
      await refresh();
      setNote(null);
      toast.show('Note updated');
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSavingNote(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await apiFetch(`/admin/api/orders/${id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      });
      await refresh();
      setCancelOpen(false);
      toast.show('Order cancelled');
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Orders', url: `/store/${slug}/orders` }}
      title={`#${order.orderNumber}`}
      titleMetadata={
        <InlineStack gap="200">
          {alreadyCancelled ? <CancelledBadge /> : null}
          <FinancialBadge order={order} />
          <FulfillmentBadge order={order} />
        </InlineStack>
      }
      subtitle={placed}
      secondaryActions={
        alreadyCancelled
          ? []
          : [
              {
                content: 'Cancel order',
                destructive: true,
                disabled: paid,
                onAction: () => setCancelOpen(true),
                // Shopify explains the disabled state rather than hiding it.
                helpText: paid ? 'Refund the payment before cancelling this order.' : undefined,
              },
            ]
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <LineItemsCards order={order} fulfilHref={`/store/${slug}/orders/${id}/fulfill`} />
            <PaymentCard order={order} refundHref={`/store/${slug}/orders/${id}/refund`} />
            <Card>
              <Timeline events={order.events} onComment={postComment} posting={posting} />
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Notes
                </Text>
                <TextField
                  label="Order note"
                  labelHidden
                  multiline={3}
                  autoComplete="off"
                  placeholder="No notes from customer"
                  value={note ?? order.note ?? ''}
                  onChange={setNote}
                />
                {note !== null && note !== (order.note ?? '') ? (
                  <InlineStack align="end" gap="200">
                    <Link onClick={() => setNote(null)}>Discard</Link>
                    <Link onClick={savingNote ? undefined : saveNote}>
                      {savingNote ? 'Saving…' : 'Save'}
                    </Link>
                  </InlineStack>
                ) : null}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Customer
                </Text>
                {order.customer ? (
                  <BlockStack gap="100">
                    <Link url={`/store/${slug}/customers/${order.customer.id}`}>
                      {[order.customer.firstName, order.customer.lastName]
                        .filter(Boolean)
                        .join(' ') || order.customer.email}
                    </Link>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {order.customer.ordersCount} order
                      {order.customer.ordersCount === 1 ? '' : 's'}
                    </Text>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Guest checkout
                  </Text>
                )}

                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Contact information
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {order.email}
                  </Text>
                  {order.phone ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      {order.phone}
                    </Text>
                  ) : null}
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Shipping address
                  </Text>
                  <AddressBlock address={order.shippingAddress} />
                </BlockStack>

                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Billing address
                  </Text>
                  <AddressBlock address={order.billingAddress} />
                </BlockStack>
              </BlockStack>
            </Card>

            {order.tags.length > 0 ? (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Tags
                  </Text>
                  <InlineStack gap="150">
                    {order.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </InlineStack>
                </BlockStack>
              </Card>
            ) : null}
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel order #${order.orderNumber}?`}
        primaryAction={{
          content: 'Cancel order',
          destructive: true,
          loading: cancelling,
          onAction: cancel,
        }}
        secondaryActions={[
          { content: 'Keep order', onAction: () => setCancelOpen(false), disabled: cancelling },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Cancelling restocks the items and cannot be undone. The customer is notified.
            </Text>
            <Select
              label="Reason for cancellation"
              options={CANCEL_REASONS}
              value={cancelReason}
              onChange={setCancelReason}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
