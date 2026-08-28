'use client';

/**
 * The product form (PARITY.md → Detail/form pages → Product form). Owner: WS-B.
 *
 * Two columns, exactly as Shopify: left is what the product IS (title,
 * description, media, variants), right is how it is published (status,
 * channels, organization). Both create and edit render this — the only
 * difference is whether there is an id to PUT to.
 *
 * Saving is two steps on purpose. The product write carries everything except
 * stock; quantities then go through the inventory service, because that is the
 * only path that leaves an adjustment record behind (CLAUDE.md §9).
 */
import type { Location } from '@merchant/contracts/locations';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Card,
  Combobox,
  InlineStack,
  Layout,
  Listbox,
  Modal,
  Page,
  Select,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import {
  draftFromProduct,
  draftToInput,
  emptyDraft,
  type ProductDraft,
  stockChanges,
  validate,
} from '../../../../../lib/product-draft.ts';
import { MediaCard } from './media-card.tsx';
import { VariantsCard } from './variants-card.tsx';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

/** Enough for the currencies the demo ships; falls back to the code itself. */
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

function TagsField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [value, setValue] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim();
    if (tag !== '' && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...tags, tag]);
    }
    setValue('');
  };

  return (
    <BlockStack gap="200">
      {/* Enter is caught on a wrapper: Polaris text fields expose no onKeyDown. */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: wrapper only relays the input's own keys */}
      <div
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add(value);
          }
        }}
      >
        <Combobox
          activator={
            <Combobox.TextField
              label="Tags"
              autoComplete="off"
              value={value}
              onChange={setValue}
              placeholder="Add a tag and press Enter"
            />
          }
        >
          {value.trim() === '' ? null : (
            <Listbox onSelect={() => add(value)}>
              <Listbox.Action value={value}>{`Add "${value.trim()}"`}</Listbox.Action>
            </Listbox>
          )}
        </Combobox>
      </div>
      {tags.length > 0 ? (
        <InlineStack gap="100" wrap>
          {tags.map((tag) => (
            <Tag key={tag} onRemove={() => onChange(tags.filter((t) => t !== tag))}>
              {tag}
            </Tag>
          ))}
        </InlineStack>
      ) : null}
    </BlockStack>
  );
}

export function ProductForm({
  slug,
  product,
  currencyCode,
}: {
  slug: string;
  /** Absent on `/products/new`. */
  product?: Product;
  currencyCode: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const baseline = useMemo(() => (product ? draftFromProduct(product) : emptyDraft()), [product]);
  const [draft, setDraft] = useState<ProductDraft>(baseline);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Locations decide whether stock is editable here at all: with one location
  // the number is unambiguous, with several the product form would have to pick
  // one silently, so Shopify sends you to Inventory instead.
  const locations = useApiQuery<{ data: Location[] }>(['locations'], '/admin/api/locations');
  const stockLocation = locations.data?.data[0];
  const stockEditable = (locations.data?.data.length ?? 0) === 1;

  const errors = validate(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;

  const patch = useCallback((changes: Partial<ProductDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  }, []);

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const body = draftToInput(draft, currencyCode);
      const saved = product
        ? await apiFetch<Product>(`/admin/api/products/${product.id}`, { method: 'PUT', body })
        : await apiFetch<Product>('/admin/api/products', { method: 'POST', body });

      // Stock second, and only what changed — every call writes an adjustment.
      const changes = stockLocation ? stockChanges(draft, saved) : [];
      if (changes.length > 0 && stockLocation) {
        await apiFetch('/admin/api/inventory/set', {
          method: 'POST',
          body: {
            levels: changes.map((change) => ({ ...change, locationId: stockLocation.id })),
          },
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show('Product saved');

      if (product) {
        await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
        setDraft(draftFromProduct(saved));
      } else {
        router.replace(`/store/${slug}/products/${saved.id}`);
      }
    } catch (cause) {
      const error = cause as ApiError;
      setServerError(error.message);
      toast.error('Could not save product');
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setConfirmingDelete(false);
    setSaving(true);
    try {
      await apiFetch(`/admin/api/products/${product?.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show('Product deleted');
      router.replace(`/store/${slug}/products`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
      setSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Products', url: `/store/${slug}/products` }}
      title={product ? product.title : 'Add product'}
      secondaryActions={
        product
          ? [{ content: 'Delete', destructive: true, onAction: () => setConfirmingDelete(true) }]
          : undefined
      }
    >
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setDraft(baseline);
          setSubmitted(false);
          setServerError(null);
        }}
      />

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <TextField
                  label="Title"
                  name="title"
                  autoComplete="off"
                  placeholder="Short sleeve t-shirt"
                  value={draft.title}
                  error={submitted ? errors.title : undefined}
                  onChange={(title) => patch({ title })}
                />
                <TextField
                  label="Description"
                  name="description"
                  autoComplete="off"
                  multiline={6}
                  value={draft.description}
                  helpText={
                    draft.descriptionIsRich
                      ? 'This description uses formatting, so it is shown as HTML.'
                      : undefined
                  }
                  onChange={(description) => patch({ description })}
                />
              </BlockStack>
            </Card>

            <MediaCard images={draft.images} onChange={(images) => patch({ images })} />

            <VariantsCard
              options={draft.options}
              variants={draft.variants}
              currencySymbol={currencySymbol}
              stockLabel={
                stockEditable || !stockLocation ? 'Available' : `Available at ${stockLocation.name}`
              }
              stockEditable={stockEditable}
              error={submitted ? errors.variants : undefined}
              onChange={({ options, variants }) => patch({ options, variants })}
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={draft.status}
                onChange={(status) => patch({ status: status as ProductDraft['status'] })}
              />
            </Card>

            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">
                  Publishing
                </Text>
                {/* One sales channel exists in this product (SPEC §2 — no
                    multi-channel), so this states the fact rather than
                    offering a toggle that does nothing. */}
                <Text as="p" tone="subdued">
                  Online Store
                </Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingSm">
                  Product organization
                </Text>
                <TextField
                  label="Product type"
                  autoComplete="off"
                  value={draft.productType}
                  onChange={(productType) => patch({ productType })}
                />
                <TextField
                  label="Vendor"
                  autoComplete="off"
                  value={draft.vendor}
                  onChange={(vendor) => patch({ vendor })}
                />
                <TagsField tags={draft.tags} onChange={(tags) => patch({ tags })} />
              </BlockStack>
            </Card>

            {serverError ? (
              <Card>
                <Text as="p" tone="critical">
                  {serverError}
                </Text>
              </Card>
            ) : null}
          </BlockStack>
        </Layout.Section>
      </Layout>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${product?.title ?? 'product'}?`}
        primaryAction={{ content: 'Delete', destructive: true, onAction: destroy }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This can’t be undone. Orders that already include this product keep their details.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
