'use client';

/**
 * The collection form, both kinds (PARITY.md → Collection form).
 * Owner: WS-B (B6).
 *
 * The type is chosen at creation and locked afterwards, as Shopify does: a
 * manual collection's positions and a smart one's rules are not convertible,
 * and the API refuses the swap anyway.
 *
 * Membership is saved in a second request for a manual collection, because
 * `POST /:id/products` is the endpoint that understands add / remove / reorder
 * as one edit — the same shape one save of the picker produces.
 */
import type { Collection, CollectionRuleSet } from '@merchant/contracts/collections';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Card,
  ChoiceList,
  InlineStack,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { newRule } from '../../../../../lib/collection-rules.ts';
import { htmlToText, isSimpleHtml, textToHtml } from '../../../../../lib/description-html.ts';
import { CollectionImageCard } from './image-card.tsx';
import { type PickedProduct, ProductPicker } from './product-picker.tsx';
import { RulesBuilder } from './rules-builder.tsx';

const SORT_OPTIONS = [
  { label: 'Manually', value: 'manual' },
  { label: 'Best selling', value: 'best-selling' },
  { label: 'Product title A–Z', value: 'title-asc' },
  { label: 'Product title Z–A', value: 'title-desc' },
  { label: 'Price, low to high', value: 'price-asc' },
  { label: 'Price, high to low', value: 'price-desc' },
  { label: 'Newest first', value: 'created-desc' },
];

type Draft = {
  title: string;
  /** Plain text normally; the raw HTML when it is too rich to unwrap. */
  description: string;
  descriptionIsRich: boolean;
  type: 'manual' | 'smart';
  sortOrder: string;
  imageUrl: string | null;
  ruleSet: CollectionRuleSet;
  products: PickedProduct[];
};

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  descriptionIsRich: false,
  type: 'manual',
  sortOrder: 'manual',
  imageUrl: null,
  ruleSet: { appliedDisjunctively: false, rules: [newRule()] },
  products: [],
});

export function CollectionForm({
  slug,
  collection,
  currencyCode,
}: {
  slug: string;
  /** Absent on `/collections/new`. */
  collection?: Collection;
  currencyCode: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  // A manual collection's current members, so the picker starts from them and
  // the save can compute what was added, removed and reordered.
  const members = useApiQuery<Paginated<Product>>(
    ['collection-products', collection?.id ?? 'new'],
    `/admin/api/collections/${collection?.id}/products?limit=250`,
    { enabled: Boolean(collection && collection.type === 'manual') },
  );

  const baseline = useMemo<Draft>(() => {
    if (!collection) return emptyDraft();
    return {
      title: collection.title,
      description: isSimpleHtml(collection.descriptionHtml)
        ? htmlToText(collection.descriptionHtml)
        : collection.descriptionHtml,
      descriptionIsRich: !isSimpleHtml(collection.descriptionHtml),
      type: collection.type,
      sortOrder: collection.sortOrder,
      imageUrl: collection.imageUrl,
      ruleSet: collection.ruleSet ?? { appliedDisjunctively: false, rules: [newRule()] },
      products: (members.data?.data ?? []).map((product) => ({
        id: product.id,
        title: product.title,
        imageUrl: product.images[0]?.url ?? null,
      })),
    };
  }, [collection, members.data]);

  const [draft, setDraft] = useState<Draft>(baseline);
  // The members arrive after the first render, so the draft adopts them once.
  const [adoptedMembers, setAdoptedMembers] = useState(false);
  if (!adoptedMembers && collection?.type === 'manual' && members.data) {
    setAdoptedMembers(true);
    setDraft(baseline);
  }

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  const titleError = draft.title.trim() === '' ? 'Title is required' : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (titleError) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: draft.title.trim(),
        descriptionHtml: draft.descriptionIsRich
          ? draft.description
          : textToHtml(draft.description),
        sortOrder: draft.sortOrder,
        imageUrl: draft.imageUrl,
        ...(collection ? {} : { type: draft.type }),
        ...(draft.type === 'smart'
          ? {
              ruleSet: {
                ...draft.ruleSet,
                rules: draft.ruleSet.rules.filter((r) => r.condition !== ''),
              },
            }
          : {}),
      };

      const saved = collection
        ? await apiFetch<Collection>(`/admin/api/collections/${collection.id}`, {
            method: 'PUT',
            body,
          })
        : await apiFetch<Collection>('/admin/api/collections', {
            method: 'POST',
            // A new manual collection can carry its members straight in.
            body: {
              ...body,
              ...(draft.type === 'manual' ? { productIds: draft.products.map((p) => p.id) } : {}),
            },
          });

      // Membership on an EXISTING manual collection is its own endpoint.
      if (collection && draft.type === 'manual') {
        const before = baseline.products.map((p) => p.id);
        const after = draft.products.map((p) => p.id);
        const add = after.filter((id) => !before.includes(id));
        const remove = before.filter((id) => !after.includes(id));
        const reorder = after.map((productId, position) => ({ productId, position }));
        if (
          add.length > 0 ||
          remove.length > 0 ||
          JSON.stringify(before) !== JSON.stringify(after)
        ) {
          await apiFetch(`/admin/api/collections/${collection.id}/products`, {
            method: 'POST',
            body: { add, remove, reorder },
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.show('Collection saved');

      if (collection) {
        await queryClient.invalidateQueries({ queryKey: ['collection', collection.id] });
        await queryClient.invalidateQueries({ queryKey: ['collection-products', collection.id] });
        setAdoptedMembers(false);
      } else {
        router.replace(`/store/${slug}/collections/${saved.id}`);
      }
    } catch (cause) {
      setServerError((cause as ApiError).message);
      toast.error('Could not save collection');
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setConfirmingDelete(false);
    setSaving(true);
    try {
      await apiFetch(`/admin/api/collections/${collection?.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.show('Collection deleted');
      router.replace(`/store/${slug}/collections`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
      setSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Collections', url: `/store/${slug}/collections` }}
      title={collection ? collection.title : 'Create collection'}
      secondaryActions={
        collection
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
                  placeholder="Summer collection"
                  value={draft.title}
                  error={submitted ? titleError : undefined}
                  onChange={(title) => patch({ title })}
                />
                <TextField
                  label="Description"
                  autoComplete="off"
                  multiline={5}
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

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingSm">
                  Collection type
                </Text>
                {collection ? (
                  <Text as="p" tone="subdued">
                    {collection.type === 'smart'
                      ? 'Automated — products are selected by the conditions below.'
                      : 'Manual — products are added one by one.'}
                  </Text>
                ) : (
                  <ChoiceList
                    title="Collection type"
                    titleHidden
                    choices={[
                      {
                        label: 'Manual',
                        value: 'manual',
                        helpText: 'Add products to this collection one by one.',
                      },
                      {
                        label: 'Automated',
                        value: 'smart',
                        helpText:
                          'Existing and future products that match the conditions are added automatically.',
                      },
                    ]}
                    selected={[draft.type]}
                    onChange={([type]) =>
                      patch({
                        type: type as Draft['type'],
                        // A smart collection has no dragged positions; without
                        // this the Select showed one order and saved another.
                        ...(type === 'smart' && draft.sortOrder === 'manual'
                          ? { sortOrder: 'created-desc' }
                          : {}),
                      })
                    }
                  />
                )}
              </BlockStack>
            </Card>

            {draft.type === 'smart' ? (
              <RulesBuilder
                ruleSet={draft.ruleSet}
                currencyCode={currencyCode}
                onChange={(ruleSet) => patch({ ruleSet })}
              />
            ) : (
              <ProductPicker
                products={draft.products}
                onChange={(products) => patch({ products })}
              />
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <Select
                label="Sort products by"
                options={
                  // A smart collection has no dragged positions to honour.
                  draft.type === 'smart'
                    ? SORT_OPTIONS.filter((option) => option.value !== 'manual')
                    : SORT_OPTIONS
                }
                value={draft.sortOrder}
                onChange={(sortOrder) => patch({ sortOrder })}
              />
            </Card>

            <CollectionImageCard
              imageUrl={draft.imageUrl}
              onChange={(imageUrl) => patch({ imageUrl })}
            />

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
        title={`Delete ${collection?.title ?? 'collection'}?`}
        primaryAction={{ content: 'Delete', destructive: true, onAction: destroy }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <InlineStack>
            <Text as="p">This can’t be undone. The products in it are not deleted.</Text>
          </InlineStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
