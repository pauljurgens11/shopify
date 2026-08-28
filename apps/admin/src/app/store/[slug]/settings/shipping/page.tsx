'use client';

/**
 * Settings → Shipping (SPEC §10). Owner: WS-A.
 *
 * Merchant-defined flat and price-conditional rates only — carrier-calculated
 * shipping is a hard out-of-scope stop (SPEC §2).
 *
 * Money crosses this boundary as integer minor units (SPEC §5). The form holds
 * decimal *strings* only because that is what a text input is; conversion is
 * `fromDecimal`/`toDecimal`, never `parseFloat`.
 */
import { format, fromDecimal, toDecimal } from '@merchant/config/money';
import type { ShippingRate } from '@merchant/contracts/shops';
import {
  BlockStack,
  Box,
  Button,
  Card,
  FormLayout,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';

const KEY = ['settings', 'shipping-rates'];
const PATH = '/admin/api/settings/shipping-rates';

type Draft = { name: string; price: string; min: string; max: string };

const EMPTY: Draft = { name: '', price: '', min: '', max: '' };

const toDraft = (rate: ShippingRate): Draft => ({
  name: rate.name,
  price: String(toDecimal(rate.price)),
  min: rate.minOrderSubtotal ? String(toDecimal(rate.minOrderSubtotal)) : '',
  max: rate.maxOrderSubtotal ? String(toDecimal(rate.maxOrderSubtotal)) : '',
});

function conditionText(rate: ShippingRate): string {
  const min = rate.minOrderSubtotal;
  const max = rate.maxOrderSubtotal;
  if (min && max) return `Orders ${format(min)}–${format(max)}`;
  if (min) return `Orders ${format(min)} and up`;
  if (max) return `Orders up to ${format(max)}`;
  return 'All orders';
}

export default function ShippingSettingsPage() {
  const { data: session } = useSession();
  const currency = session?.shop.currencyCode ?? 'USD';
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isPending } = useApiQuery<{ data: ShippingRate[] }>(KEY, PATH);
  const rates = data?.data ?? [];

  const [editing, setEditing] = useState<ShippingRate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (rate: ShippingRate | null) => {
    setEditing(rate);
    setDraft(rate ? toDraft(rate) : EMPTY);
    setError(null);
  };
  const close = () => {
    setEditing(null);
    setDraft(null);
    setError(null);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const submit = () => {
    if (!draft) return;
    setSaving(true);
    setError(null);

    let body: unknown;
    try {
      body = {
        name: draft.name.trim(),
        price: fromDecimal(draft.price || '0', currency),
        minOrderSubtotal: draft.min.trim() ? fromDecimal(draft.min, currency) : null,
        maxOrderSubtotal: draft.max.trim() ? fromDecimal(draft.max, currency) : null,
      };
    } catch {
      // fromDecimal throws on anything that is not a plain decimal amount.
      setError('Enter amounts as numbers, for example 4.99.');
      setSaving(false);
      return;
    }

    apiFetch(editing ? `${PATH}/${editing.id}` : PATH, {
      method: editing ? 'PUT' : 'POST',
      body,
    })
      .then(() => {
        toast.show(editing ? 'Shipping rate updated' : 'Shipping rate added');
        close();
        return refresh();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setSaving(false));
  };

  const remove = (rate: ShippingRate) => {
    apiFetch(`${PATH}/${rate.id}`, { method: 'DELETE' })
      .then(() => {
        toast.show('Shipping rate deleted');
        return refresh();
      })
      .catch((cause: ApiError) => toast.error(cause.message));
  };

  return (
    <SettingsPage title="Shipping and delivery" loading={isPending}>
      <Card>
        {rates.length === 0 ? (
          /* Polaris EmptyState requires an `image`, and "" renders an
             <img src=""> the browser resolves against the page URL. */
          <Box padding="800">
            <BlockStack gap="300" inlineAlign="center">
              <Text as="h2" variant="headingMd">
                Add a shipping rate
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Customers choose from these rates at checkout.
              </Text>
              <Button variant="primary" onClick={() => open(null)}>
                Add rate
              </Button>
            </BlockStack>
          </Box>
        ) : (
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Rates
              </Text>
              <Button onClick={() => open(null)}>Add rate</Button>
            </InlineStack>

            <ResourceList
              resourceName={{ singular: 'rate', plural: 'rates' }}
              items={rates}
              renderItem={(rate) => (
                // Polaris returns renderItem's element as-is, so the key is ours to set.
                <ResourceItem key={rate.id} id={rate.id} onClick={() => open(rate)}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <Text as="span" fontWeight="semibold">
                        {rate.name}
                      </Text>
                      <Text as="span" tone="subdued">
                        {conditionText(rate)}
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300" blockAlign="center">
                      <Text as="span">{format(rate.price)}</Text>
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => remove(rate)}
                        accessibilityLabel={`Delete ${rate.name}`}
                      >
                        Delete
                      </Button>
                    </InlineStack>
                  </InlineStack>
                </ResourceItem>
              )}
            />
          </BlockStack>
        )}
      </Card>

      <Modal
        open={draft !== null}
        onClose={close}
        title={editing ? 'Edit rate' : 'Add rate'}
        primaryAction={{ content: 'Save', onAction: submit, loading: saving }}
        secondaryActions={[{ content: 'Cancel', onAction: close }]}
      >
        <Modal.Section>
          <FormLayout>
            {error ? (
              <Text as="p" tone="critical">
                {error}
              </Text>
            ) : null}
            <TextField
              label="Rate name"
              name="name"
              autoComplete="off"
              placeholder="Standard shipping"
              value={draft?.name ?? ''}
              onChange={(name) => setDraft((d) => ({ ...(d ?? EMPTY), name }))}
            />
            <TextField
              label="Price"
              name="price"
              type="number"
              prefix="$"
              min={0}
              step={0.01}
              autoComplete="off"
              helpText="Enter 0 for free shipping."
              value={draft?.price ?? ''}
              onChange={(price) => setDraft((d) => ({ ...(d ?? EMPTY), price }))}
            />
            <FormLayout.Group>
              <TextField
                label="Minimum order price"
                name="min"
                type="number"
                prefix="$"
                min={0}
                step={0.01}
                autoComplete="off"
                helpText="Optional."
                value={draft?.min ?? ''}
                onChange={(min) => setDraft((d) => ({ ...(d ?? EMPTY), min }))}
              />
              <TextField
                label="Maximum order price"
                name="max"
                type="number"
                prefix="$"
                min={0}
                step={0.01}
                autoComplete="off"
                helpText="Optional."
                value={draft?.max ?? ''}
                onChange={(max) => setDraft((d) => ({ ...(d ?? EMPTY), max }))}
              />
            </FormLayout.Group>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </SettingsPage>
  );
}
