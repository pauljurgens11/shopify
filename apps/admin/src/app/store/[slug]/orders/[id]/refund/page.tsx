'use client';

/**
 * Refund flow (SPEC §9, C5). Owner: WS-C.
 *
 * Every figure on this page comes from `POST /refunds/calculate` — the browser
 * never does refund arithmetic (C5 landmine). The button carries the amount,
 * the way Shopify's does, so the merchant reads what they are about to send
 * back before they send it.
 */
import { format } from '@merchant/config/money';
import type { OrderDetail, RefundCalculation } from '@merchant/contracts/orders';
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
  Thumbnail,
} from '@shopify/polaris';
import { ImageIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../../lib/api.ts';
import { remainingToRefund } from '../../_components/status.ts';

/** Decimal string → integer minor units, without ever touching a float. */
function toMinorUnits(value: string, currencyCode: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(trimmed);
  if (!match) return 0;
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(2, '0');
  // Currency-agnostic enough for the currencies in scope; the authoritative
  // amount still comes back from `refunds/calculate`.
  return Number(`${whole || '0'}${currencyCode === 'JPY' ? '' : fraction}`);
}

export default function RefundPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const order = useApiQuery<OrderDetail>(['order', id], `/admin/api/orders/${id}`);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [shipping, setShipping] = useState('');
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');
  const [calculation, setCalculation] = useState<RefundCalculation | null>(null);
  const [saving, setSaving] = useState(false);

  const detail = order.data;
  const currencyCode = detail?.total.currencyCode ?? 'USD';

  const lineItems = useMemo(
    () =>
      Object.entries(quantities)
        .map(([lineItemId, value]) => ({ lineItemId, quantity: Number(value) || 0 }))
        .filter((entry) => entry.quantity > 0),
    [quantities],
  );

  const shippingAmount = useMemo(
    () => ({ amount: toMinorUnits(shipping, currencyCode), currencyCode }),
    [shipping, currencyCode],
  );

  // The server owns the arithmetic; this just asks it again whenever the form
  // changes. Nothing on screen is derived locally.
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    // Debounced: the shipping field would otherwise POST once per keystroke.
    const timer = window.setTimeout(() => {
      void apiFetch<RefundCalculation>(`/admin/api/orders/${id}/refunds/calculate`, {
        method: 'POST',
        body: { lineItems, shippingAmount, restock },
      })
        .then((result) => {
          if (!cancelled) setCalculation(result);
        })
        .catch(() => {
          if (!cancelled) setCalculation(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [detail, id, lineItems, shippingAmount, restock]);

  if (order.isPending) return <PageSkeleton />;
  if (!detail) return null;

  const refundable = detail.lineItems.filter((line) => remainingToRefund(line) > 0);
  const total = calculation?.total ?? { amount: 0, currencyCode };
  const canRefund = total.amount > 0 && !saving;

  /**
   * Derived from what is being refunded, NOT regenerated per attempt: if a
   * request times out after the server already created the refund, retrying
   * must replay the same key — a fresh one would refund the customer twice.
   * Changing the form changes the key, because that is a different refund.
   */
  const idempotencyKey = `refund-${id}-${JSON.stringify({ lineItems, shippingAmount, restock })}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 128);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/api/orders/${id}/refunds`, {
        method: 'POST',
        body: {
          lineItems,
          shippingAmount,
          restock,
          idempotencyKey,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.show('Refund issued');
      router.push(`/store/${slug}/orders/${id}`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: `#${detail.orderNumber}`, url: `/store/${slug}/orders/${id}` }}
      title={`Refund · #${detail.orderNumber}`}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Items
                </Text>
                {refundable.length === 0 ? (
                  <Text as="p" tone="subdued">
                    Every item on this order has already been refunded.
                  </Text>
                ) : (
                  refundable.map((line) => {
                    const max = remainingToRefund(line);
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
                            <Text as="span" variant="bodySm" tone="subdued">
                              {format(line.price)} each
                            </Text>
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

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Refund shipping
                </Text>
                <TextField
                  label="Shipping amount"
                  type="number"
                  min={0}
                  step={0.01}
                  max={detail.shippingTotal.amount / 100}
                  prefix="$"
                  autoComplete="off"
                  value={shipping}
                  onChange={setShipping}
                  helpText={`${format(detail.shippingTotal)} was charged for shipping.`}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Reason for refund
                </Text>
                <TextField
                  label="Reason"
                  labelHidden
                  autoComplete="off"
                  placeholder="Only you and other staff can see this reason"
                  value={reason}
                  onChange={setReason}
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Summary
              </Text>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span">Items subtotal</Text>
                  <Text as="span" numeric>
                    {format(calculation?.subtotal ?? { amount: 0, currencyCode })}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Tax</Text>
                  <Text as="span" numeric>
                    {format(calculation?.taxAmount ?? { amount: 0, currencyCode })}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span">Shipping</Text>
                  <Text as="span" numeric>
                    {format(calculation?.shippingAmount ?? { amount: 0, currencyCode })}
                  </Text>
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                  <Text as="span" fontWeight="semibold">
                    Refund total
                  </Text>
                  <Text as="span" numeric fontWeight="semibold">
                    {format(total)}
                  </Text>
                </InlineStack>
                {calculation ? (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {format(calculation.maximumRefundable)} available to refund.
                  </Text>
                ) : null}
              </BlockStack>

              <Checkbox label="Restock refunded items" checked={restock} onChange={setRestock} />

              <Button
                variant="primary"
                size="large"
                fullWidth
                loading={saving}
                disabled={!canRefund}
                onClick={() => void submit()}
              >
                {total.amount > 0 ? `Refund ${format(total)}` : 'Refund'}
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
