'use client';

/**
 * The discount form (PARITY.md → Detail/form pages). Owner: WS-C (C6).
 *
 * Left column, in Shopify's order: method → value → applies to → minimum
 * requirements → usage limits → active dates. Right column: the summary card,
 * which restates the rules as prose so the merchant can check what they built
 * without re-reading six controls.
 *
 * Which controls appear depends on the type, which is why the index's create
 * button is a split menu rather than a plain "New".
 */
import { format } from '@merchant/config/money';
import type { Discount } from '@merchant/contracts/discounts';
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  ChoiceList,
  Form,
  FormLayout,
  InlineError,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch } from '../../../../../lib/api.ts';
import { type DiscountDraft, draftToInput, generateCode, validate } from './discount-draft.ts';
import { ResourcePickerModal } from './resource-picker.tsx';

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

const TYPE_TITLES: Record<Discount['type'], string> = {
  amount_off_order: 'Amount off order',
  amount_off_products: 'Amount off products',
  free_shipping: 'Free shipping',
};

/** The summary card's bullets — the same sentences Shopify uses. */
function summaryLines(draft: DiscountDraft, currencyCode: string): string[] {
  const lines: string[] = [];

  if (draft.type === 'free_shipping') {
    lines.push('Free shipping on all orders');
  } else if (draft.valueType === 'percentage') {
    const target = draft.type === 'amount_off_products' ? 'the selected products' : 'the order';
    lines.push(`${draft.value || '0'}% off ${target}`);
  } else {
    const amount = format({
      amount: Math.round(Number(draft.value || '0') * 100),
      currencyCode,
    });
    lines.push(`${amount} off`);
  }

  if (draft.appliesToScope === 'collections') {
    lines.push(
      `Applies to ${draft.collectionIds.length} collection${draft.collectionIds.length === 1 ? '' : 's'}`,
    );
  } else if (draft.appliesToScope === 'products') {
    lines.push(
      `Applies to ${draft.productIds.length} product${draft.productIds.length === 1 ? '' : 's'}`,
    );
  }

  if (draft.minimumKind === 'subtotal' && draft.minimumSubtotal !== '') {
    lines.push(`Minimum purchase of ${draft.minimumSubtotal}`);
  }
  if (draft.minimumKind === 'quantity' && draft.minimumQuantity !== '') {
    lines.push(`Minimum quantity of ${draft.minimumQuantity} items`);
  }

  lines.push(draft.method === 'code' ? 'Code required at checkout' : 'Applies automatically');
  if (draft.oncePerCustomer) lines.push('One use per customer');
  if (draft.hasUsageLimit && draft.usageLimit !== '') {
    lines.push(`Limited to ${draft.usageLimit} uses in total`);
  }
  lines.push(
    draft.hasEndDate && draft.endsAt !== ''
      ? `Active from ${draft.startsAt} to ${draft.endsAt}`
      : `Active from ${draft.startsAt}`,
  );

  return lines;
}

export function DiscountForm({
  slug,
  currencyCode,
  initial,
  discountId,
}: {
  slug: string;
  currencyCode: string;
  initial: DiscountDraft;
  discountId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<DiscountDraft>(initial);
  const [baseline, setBaseline] = useState<DiscountDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<'products' | 'collections' | null>(null);

  const set = <K extends keyof DiscountDraft>(key: K, value: DiscountDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setServerErrors({});
  };

  const errors = validate(draft);
  const shown = submitted ? { ...errors, ...serverErrors } : serverErrors;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;

  const lines = useMemo(() => summaryLines(draft, currencyCode), [draft, currencyCode]);

  const save = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const body = draftToInput(draft, currencyCode);
      const saved = await apiFetch<Discount>(
        discountId ? `/admin/api/discounts/${discountId}` : '/admin/api/discounts',
        { method: discountId ? 'PUT' : 'POST', body },
      );
      await queryClient.invalidateQueries({ queryKey: ['discounts'] });
      setBaseline(draft);
      toast.show(discountId ? 'Discount saved' : 'Discount created');
      if (!discountId) router.push(`/store/${slug}/discounts/${saved.id}`);
    } catch (cause) {
      const error = cause as ApiError;
      if (error.field) setServerErrors({ [error.field]: error.message });
      else toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!discountId) return;
    try {
      await apiFetch(`/admin/api/discounts/${discountId}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['discounts'] });
      toast.show('Discount deleted');
      router.push(`/store/${slug}/discounts`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
    }
  };

  return (
    <Page
      backAction={{ content: 'Discounts', url: `/store/${slug}/discounts` }}
      title={discountId ? draft.title || 'Discount' : TYPE_TITLES[draft.type]}
      subtitle={discountId ? TYPE_TITLES[draft.type] : undefined}
      secondaryActions={
        discountId ? [{ content: 'Delete', destructive: true, onAction: remove }] : undefined
      }
    >
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setDraft(baseline);
          setSubmitted(false);
        }}
      />

      <Form onSubmit={save}>
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    {TYPE_TITLES[draft.type]}
                  </Text>
                  <ChoiceList
                    title="Method"
                    choices={[
                      { label: 'Discount code', value: 'code' },
                      { label: 'Automatic discount', value: 'automatic' },
                    ]}
                    selected={[draft.method]}
                    onChange={([value]) => set('method', value as DiscountDraft['method'])}
                  />
                  {draft.method === 'code' ? (
                    <FormLayout>
                      <TextField
                        label="Discount code"
                        autoComplete="off"
                        value={draft.code}
                        onChange={(value) => set('code', value.toUpperCase())}
                        error={shown.code}
                        connectedRight={
                          <Button onClick={() => set('code', generateCode())}>Generate</Button>
                        }
                        helpText="Customers enter this code at checkout."
                      />
                    </FormLayout>
                  ) : (
                    <TextField
                      label="Title"
                      autoComplete="off"
                      value={draft.title}
                      onChange={(value) => set('title', value)}
                      error={shown.title}
                      helpText="Customers see this in their cart and at checkout."
                    />
                  )}
                  {draft.method === 'code' && (
                    <TextField
                      label="Title"
                      autoComplete="off"
                      value={draft.title}
                      onChange={(value) => set('title', value)}
                      error={shown.title}
                      helpText="Only you see this. It is how you find the discount later."
                    />
                  )}
                </BlockStack>
              </Card>

              {draft.type !== 'free_shipping' && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Value
                    </Text>
                    <FormLayout>
                      <ChoiceList
                        title="Value type"
                        titleHidden
                        choices={[
                          { label: 'Percentage', value: 'percentage' },
                          { label: 'Fixed amount', value: 'fixed' },
                        ]}
                        selected={[draft.valueType]}
                        onChange={([value]) =>
                          set('valueType', value as DiscountDraft['valueType'])
                        }
                      />
                      <TextField
                        label="Value"
                        type="number"
                        autoComplete="off"
                        value={draft.value}
                        onChange={(value) => set('value', value)}
                        error={shown.value}
                        prefix={draft.valueType === 'fixed' ? symbol : undefined}
                        suffix={draft.valueType === 'percentage' ? '%' : undefined}
                      />
                    </FormLayout>
                  </BlockStack>
                </Card>
              )}

              {draft.type === 'amount_off_products' && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Applies to
                    </Text>
                    <ChoiceList
                      title="Applies to"
                      titleHidden
                      choices={[
                        { label: 'All products', value: 'all' },
                        { label: 'Specific collections', value: 'collections' },
                        { label: 'Specific products', value: 'products' },
                      ]}
                      selected={[draft.appliesToScope]}
                      onChange={([value]) =>
                        set('appliesToScope', value as DiscountDraft['appliesToScope'])
                      }
                    />
                    {draft.appliesToScope !== 'all' && (
                      <BlockStack gap="200">
                        <InlineStack gap="300" blockAlign="center">
                          <Button onClick={() => setPicker(draft.appliesToScope as 'products')}>
                            Browse
                          </Button>
                          <Text as="span" tone="subdued">
                            {draft.appliesToScope === 'collections'
                              ? `${draft.collectionIds.length} selected`
                              : `${draft.productIds.length} selected`}
                          </Text>
                        </InlineStack>
                        {shown.appliesTo && (
                          <InlineError message={shown.appliesTo} fieldID="appliesTo" />
                        )}
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              )}

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Minimum purchase requirements
                  </Text>
                  <ChoiceList
                    title="Minimum requirements"
                    titleHidden
                    choices={[
                      { label: 'No minimum requirements', value: 'none' },
                      { label: 'Minimum purchase amount', value: 'subtotal' },
                      { label: 'Minimum quantity of items', value: 'quantity' },
                    ]}
                    selected={[draft.minimumKind]}
                    onChange={([value]) =>
                      set('minimumKind', value as DiscountDraft['minimumKind'])
                    }
                  />
                  {draft.minimumKind === 'subtotal' && (
                    <TextField
                      label="Minimum amount"
                      type="number"
                      autoComplete="off"
                      prefix={symbol}
                      value={draft.minimumSubtotal}
                      onChange={(value) => set('minimumSubtotal', value)}
                    />
                  )}
                  {draft.minimumKind === 'quantity' && (
                    <TextField
                      label="Minimum quantity"
                      type="number"
                      autoComplete="off"
                      value={draft.minimumQuantity}
                      onChange={(value) => set('minimumQuantity', value)}
                    />
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Maximum discount uses
                  </Text>
                  <Checkbox
                    label="Limit number of times this discount can be used in total"
                    checked={draft.hasUsageLimit}
                    onChange={(value) => set('hasUsageLimit', value)}
                  />
                  {draft.hasUsageLimit && (
                    <TextField
                      label="Total uses"
                      labelHidden
                      type="number"
                      autoComplete="off"
                      value={draft.usageLimit}
                      onChange={(value) => set('usageLimit', value)}
                    />
                  )}
                  <Checkbox
                    label="Limit to one use per customer"
                    checked={draft.oncePerCustomer}
                    onChange={(value) => set('oncePerCustomer', value)}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Active dates
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Start date"
                        type="date"
                        autoComplete="off"
                        value={draft.startsAt}
                        onChange={(value) => set('startsAt', value)}
                      />
                      {draft.hasEndDate && (
                        <TextField
                          label="End date"
                          type="date"
                          autoComplete="off"
                          value={draft.endsAt}
                          onChange={(value) => set('endsAt', value)}
                          error={shown.endsAt}
                        />
                      )}
                    </FormLayout.Group>
                    <Checkbox
                      label="Set an end date"
                      checked={draft.hasEndDate}
                      onChange={(value) => set('hasEndDate', value)}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Summary
                </Text>
                {draft.title.trim() === '' && draft.code.trim() === '' ? (
                  <Text as="p" tone="subdued">
                    No discount name yet.
                  </Text>
                ) : (
                  <Text as="p" fontWeight="semibold">
                    {draft.method === 'code' ? draft.code : draft.title}
                  </Text>
                )}
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Details
                  </Text>
                  <ul style={{ margin: 0, paddingInlineStart: 'var(--p-space-500)' }}>
                    {lines.map((line) => (
                      <li key={line}>
                        <Text as="span" tone="subdued">
                          {line}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Form>

      <ResourcePickerModal
        open={picker !== null}
        kind={picker ?? 'products'}
        selectedIds={picker === 'collections' ? draft.collectionIds : draft.productIds}
        onClose={() => setPicker(null)}
        onSave={(ids) => {
          set(picker === 'collections' ? 'collectionIds' : 'productIds', ids);
          setPicker(null);
        }}
      />
    </Page>
  );
}
