'use client';

/**
 * Refund flow (SPEC §9, C5). Owner: WS-C.
 *
 * Every figure on this page comes from `POST /refunds/calculate` — the browser
 * never does refund arithmetic (C5 landmine). The button carries the amount,
 * the way Shopify's does, so the merchant reads what they are about to send
 * back before they send it.
 */
import { format, fromDecimal, toDecimal } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import type { OrderDetail, RefundCalculation } from '@merchant/contracts/orders';
import {
  Banner,
  BlockStack,
  Box,
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
import { ImageIcon, OrderIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageBreadcrumb } from '../../../../../../components/shell/page-breadcrumb.tsx';
import { PageSkeleton } from '../../../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../../lib/api.ts';
import { remainingToRefund } from '../../_components/status.ts';

/**
 * One nonce per submit ATTEMPT. `crypto.randomUUID` is gated to secure
 * contexts and the documented dev admin is plain-HTTP `admin.lvh.me`;
 * `getRandomValues` has no such restriction (same call the storefront makes).
 */
function attemptNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
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
  const [calcError, setCalcError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * The idempotency key is a NONCE per submit attempt, never derived from the
   * form: two refunds with the same shape (1 of 2 units now, 1 later) are
   * different refunds, and a content-derived key made the second one replay
   * the first — money did not move but the admin recorded it. The ref keeps
   * the key stable across retries of ONE click: if the request dies on the
   * network after the server already created the refund, the retry replays
   * the same key instead of refunding twice.
   */
  const nonceRef = useRef<string>(attemptNonce());

  const detail = order.data;
  const currencyCode = detail?.total.currencyCode ?? 'USD';

  const lineItems = useMemo(
    () =>
      Object.entries(quantities)
        .map(([lineItemId, value]) => ({ lineItemId, quantity: Number(value) || 0 }))
        .filter((entry) => entry.quantity > 0),
    [quantities],
  );

  // Parse, never guess: the old hand-rolled parser sent $0.00 for input it
  // could not read. Unparseable input is a field error and blocks the refund.
  const { shippingAmount, shippingError } = useMemo((): {
    shippingAmount: MoneyDto;
    shippingError: string | null;
  } => {
    const trimmed = shipping.trim();
    const zero = { amount: 0, currencyCode };
    if (trimmed === '') return { shippingAmount: zero, shippingError: null };
    try {
      const money = fromDecimal(trimmed, currencyCode);
      if (money.amount < 0)
        return { shippingAmount: zero, shippingError: 'Enter a positive amount' };
      return { shippingAmount: money, shippingError: null };
    } catch {
      return { shippingAmount: zero, shippingError: 'Enter a valid amount' };
    }
  }, [shipping, currencyCode]);

  // The server owns the arithmetic; this just asks it again whenever the form
  // changes. Nothing on screen is derived locally.
  useEffect(() => {
    if (!detail || shippingError) return;
    let cancelled = false;
    // Debounced: the shipping field would otherwise POST once per keystroke.
    const timer = window.setTimeout(() => {
      void apiFetch<RefundCalculation>(`/admin/api/orders/${id}/refunds/calculate`, {
        method: 'POST',
        body: { lineItems, shippingAmount, restock },
      })
        .then((result) => {
          if (cancelled) return;
          setCalculation(result);
          setCalcError(null);
        })
        .catch((cause) => {
          if (cancelled) return;
          // Keep the error: silently blanking the summary to $0.00 told the
          // merchant a valid-looking refund was worth nothing.
          setCalcError(cause as ApiError);
          setCalculation(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [detail, id, lineItems, shippingAmount, restock, shippingError]);

  if (order.isPending) return <PageSkeleton layout="detail" />;
  // A bare `return null` here paints a blank white page, which reads as a
  // crash rather than a missing order.
  if (!detail) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageBreadcrumb
            icon={OrderIcon}
            title="Refund"
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

  const refundable = detail.lineItems.filter((line) => remainingToRefund(line) > 0);
  const total = calculation?.total ?? { amount: 0, currencyCode };
  const canRefund = total.amount > 0 && !saving && !shippingError && !calcError;

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/api/orders/${id}/refunds`, {
        method: 'POST',
        body: {
          lineItems,
          shippingAmount,
          restock,
          idempotencyKey: `refund-${id}-${nonceRef.current}`,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      // This attempt is spent — a later refund from this page is a new one.
      nonceRef.current = attemptNonce();
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['open-orders-count'] });
      toast.show('Refund issued');
      router.push(`/store/${slug}/orders/${id}`);
    } catch (cause) {
      const error = cause as ApiError;
      // The server ANSWERED (status > 0), so this attempt is complete and its
      // key must never be reused — a corrected resubmit is a different refund.
      // status 0 means the request may or may not have landed: keep the key so
      // a retry of the same click cannot refund twice.
      if (error.status !== 0) nonceRef.current = attemptNonce();
      toast.error(error.message);
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
        title={`Refund · #${detail.orderNumber}`}
      />

      <Box paddingBlockStart="400">
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
                    // Display-layer conversion through the money helper — never `/ 100`.
                    max={toDecimal(detail.shippingTotal)}
                    prefix="$"
                    autoComplete="off"
                    value={shipping}
                    onChange={setShipping}
                    error={shippingError ?? undefined}
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

                {calcError ? (
                  <Banner tone="critical" title="Couldn’t calculate this refund">
                    <Text as="p">
                      {calcError.field ? `${calcError.field}: ` : ''}
                      {calcError.message}
                    </Text>
                  </Banner>
                ) : null}

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
      </Box>
    </Page>
  );
}
