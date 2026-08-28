'use client';

/**
 * "Charge saved card" on the order page — the repeat-billing beat (SPEC §11,
 * D4). Owner: WS-D; C5 mounts it with a one-line import.
 *
 * Renders nothing unless the order's customer has a saved card, so the order
 * page carries no dead UI for the common case (CLAUDE.md §8).
 *
 * A decline is a 200 with `status: 'failed'` (the card was rejected; the
 * charge API worked) — it renders as a banner in the modal, and only then is a
 * fresh idempotency key minted: replaying a declined key would just return the
 * failed payment row again. A TRANSPORT failure keeps the key, so retrying a
 * charge whose response was lost replays it instead of charging twice.
 */
import { format, fromDecimal, type Money, minorUnitFactor } from '@merchant/config/money';
import type { OrderDetail } from '@merchant/contracts/orders';
import type { Payment, PaymentMethod } from '@merchant/contracts/pay';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  InlineStack,
  Modal,
  Text,
  TextField,
} from '@shopify/polaris';
import { useState } from 'react';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { capturedTotal } from '../../orders/_components/status.ts';

/**
 * NOT crypto.randomUUID(): that is secure-context-only, so it is undefined on
 * the documented dev origin http://admin.lvh.me:3000 while working everywhere
 * else — the worst way for a bug to hide (see DECISIONS.md, WS-E).
 */
function idempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `admin-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  diners: 'Diners Club',
};

const brandLabel = (brand: string) => BRAND_LABELS[brand] ?? 'Card';

/** `{amount: 1050}` → `"10.50"` — what the amount field starts out holding. */
function toAmountString(money: Money): string {
  const factor = minorUnitFactor(money.currencyCode);
  return (money.amount / factor).toFixed(factor === 1 ? 0 : 2);
}

export function ChargeSavedCard({
  order,
  onCharged,
}: {
  order: OrderDetail;
  onCharged: () => void;
}) {
  const toast = useToast();
  const customerId = order.customer?.id;

  const { data } = useApiQuery<{ data: PaymentMethod[] }>(
    ['payment-methods', customerId],
    `/admin/api/payments/payment-methods?customerId=${customerId}`,
    { enabled: Boolean(customerId) },
  );
  const methods = data?.data ?? [];

  const [charging, setCharging] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  // One key per ATTEMPT, minted when the modal opens and kept across transport
  // failures — a retry after a lost response must replay the charge, not make
  // a second one. It rotates only when the attempt genuinely changes: a
  // definitive decline (retrying that key would just replay the failed row),
  // or an edited amount (the server refuses a reused key for a different
  // charge).
  const [chargeKey, setChargeKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!customerId || methods.length === 0) return null;

  const currencyCode = order.total.currencyCode;
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  // Prefill what is still owed; on a fully paid order, offer the order total —
  // the repeat-billing demo charges a paid order again on purpose.
  const outstanding = order.total.amount - capturedTotal(order.payments, currencyCode).amount;
  const prefill = { amount: outstanding > 0 ? outstanding : order.total.amount, currencyCode };

  const open = (method: PaymentMethod) => {
    setCharging(method);
    setAmount(toAmountString(prefill));
    setChargeKey(idempotencyKey());
    setError(null);
  };
  const close = () => {
    if (busy) return;
    setCharging(null);
    setError(null);
  };

  const charge = () => {
    if (!charging) return;

    let money: Money;
    try {
      money = fromDecimal(amount, currencyCode);
    } catch {
      setError('Enter the amount as a number, for example 25.00.');
      return;
    }
    if (money.amount <= 0) {
      setError('The amount must be more than zero.');
      return;
    }

    setBusy(true);
    setError(null);
    apiFetch<Payment>('/admin/api/payments/charge-saved-card', {
      method: 'POST',
      body: {
        paymentMethodId: charging.id,
        amount: money,
        idempotencyKey: chargeKey,
        orderId: order.id,
      },
    })
      .then((payment) => {
        if (payment.status === 'failed') {
          setError(
            payment.errorCode === 'insufficient_funds'
              ? 'The card was declined for insufficient funds.'
              : 'The card was declined.',
          );
          setChargeKey(idempotencyKey());
          // The declined attempt is a committed Payment row; the order's
          // timeline should show it without waiting for an unrelated refetch.
          onCharged();
          return;
        }
        toast.show(`${format(payment.amount)} payment collected`);
        setCharging(null);
        onCharged();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Payment methods
        </Text>
        <BlockStack gap="0">
          {methods.map((method, index) => (
            <Box key={method.id} paddingBlock="200">
              {index > 0 ? (
                <Box paddingBlockEnd="200">
                  <Divider />
                </Box>
              ) : null}
              <InlineStack align="space-between" blockAlign="center" gap="200">
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" fontWeight="semibold">
                      {brandLabel(method.brand)} •••• {method.last4}
                    </Text>
                    {method.isDefault ? <Badge>Default</Badge> : null}
                  </InlineStack>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
                  </Text>
                </BlockStack>
                <Button onClick={() => open(method)}>Charge</Button>
              </InlineStack>
            </Box>
          ))}
        </BlockStack>
      </BlockStack>

      <Modal
        open={charging !== null}
        onClose={close}
        title={
          charging ? `Charge ${brandLabel(charging.brand)} ending in ${charging.last4}` : 'Charge'
        }
        primaryAction={{ content: 'Charge', onAction: charge, loading: busy }}
        secondaryActions={[{ content: 'Cancel', onAction: close, disabled: busy }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            {error ? (
              <Banner tone="critical">
                <Text as="p">{error}</Text>
              </Banner>
            ) : null}
            <TextField
              label="Amount"
              type="number"
              prefix={currencySymbol}
              min={0}
              step={minorUnitFactor(currencyCode) === 1 ? 1 : 0.01}
              autoComplete="off"
              value={amount}
              onChange={(value) => {
                setAmount(value);
                // A different amount is a different charge — it needs its own
                // key, or the server (rightly) refuses the mismatched replay.
                setChargeKey(idempotencyKey());
                setError(null);
              }}
              helpText={`Order total is ${format(order.total)}.`}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Card>
  );
}
