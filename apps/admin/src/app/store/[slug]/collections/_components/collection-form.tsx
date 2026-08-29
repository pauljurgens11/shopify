'use client';

/**
 * The collection detail page (docs/parity/collection-detail.md).
 * Owner: WS-B (B6).
 *
 * Laid out the way Shopify's is: `Duplicate` / `View` / `More actions` in the
 * page header and no primary button (the page saves through the contextual save
 * bar), a heading card with an inline-editable title over an image drop zone, a
 * `Collection items` card holding the conditions and the product grid, and a
 * right rail whose `Add condition` / `Add products` rows are what decide the
 * collection's kind — there is no type chooser on the page.
 *
 * Membership is saved in a second request for a manual collection, because
 * `POST /:id/products` is the endpoint that understands add / remove / reorder
 * as one edit — the same shape one save of the picker produces.
 */
import type {
  Collection,
  CollectionRule,
  CollectionRuleSet,
  CollectionSortOrder,
} from '@merchant/contracts/collections';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import { BlockStack, Card, Layout, Modal, Page, Text, TextField } from '@shopify/polaris';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { membershipEdit } from '../../../../../lib/collection-edits.ts';
import { completeRules, newRule } from '../../../../../lib/collection-rules.ts';
import { htmlToText, isSimpleHtml, textToHtml } from '../../../../../lib/description-html.ts';
import { previewUrl } from '../../storefront/preview-url.ts';
import { CollectionHeaderCard } from './collection-header-card.tsx';
import { type CollectionItem, toCollectionItem } from './collection-items.tsx';
import { CollectionItemsCard } from './collection-items-card.tsx';
import { ProductPickerModal } from './product-picker.tsx';
import { ProductsRail } from './products-rail.tsx';

/** The grid shows at most this many matches; the preview endpoint caps at 50. */
const PREVIEW_LIMIT = 50;

type Draft = {
  title: string;
  /** Plain text normally; the raw HTML when it is too rich to unwrap. */
  description: string;
  descriptionIsRich: boolean;
  type: 'manual' | 'smart';
  sortOrder: CollectionSortOrder;
  imageUrl: string | null;
  ruleSet: CollectionRuleSet;
  products: CollectionItem[];
};

const emptyRuleSet = (): CollectionRuleSet => ({
  appliedDisjunctively: false,
  rules: [newRule()],
});

const emptyDraft = (): Draft => ({
  title: '',
  description: '',
  descriptionIsRich: false,
  type: 'manual',
  sortOrder: 'manual',
  imageUrl: null,
  ruleSet: emptyRuleSet(),
  products: [],
});

/** What the merchant is about to destroy by switching how products are chosen. */
type PendingSwitch = { kind: 'condition'; rule: CollectionRule } | { kind: 'products' };

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

  // A manual collection's current members, so the grid starts from them and the
  // save can compute what was added, removed and reordered. Keyed on the SAVED
  // type: converting the draft must not re-fetch a membership that is going away.
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
      ruleSet: collection.ruleSet ?? emptyRuleSet(),
      // React Query keeps a disabled query's last result, so after converting a
      // manual collection to automated the members are still cached. Reading
      // them here would leave `dirty` true forever against an empty draft.
      products:
        collection.type === 'manual' ? (members.data?.data ?? []).map(toCollectionItem) : [],
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
  const [picking, setPicking] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState<string | null>(null);

  const patch = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  /* --- what the items grid shows -------------------------------------------- */

  const rules = completeRules(draft.ruleSet.rules);
  const previewEnabled = draft.type === 'smart' && rules.length > 0;
  const preview = useQuery<Paginated<Product>, ApiError>({
    queryKey: [
      'collection-preview',
      JSON.stringify({ d: draft.ruleSet.appliedDisjunctively, rules }),
    ],
    queryFn: () =>
      apiFetch<Paginated<Product>>('/admin/api/collections/preview', {
        method: 'POST',
        body: {
          ruleSet: { appliedDisjunctively: draft.ruleSet.appliedDisjunctively, rules },
          limit: PREVIEW_LIMIT,
        },
      }),
    enabled: previewEnabled,
    retry: false,
  });

  const items =
    draft.type === 'manual' ? draft.products : (preview.data?.data ?? []).map(toCollectionItem);
  const itemsLoading =
    draft.type === 'manual'
      ? Boolean(collection && collection.type === 'manual' && members.isPending)
      : previewEnabled && preview.isPending;

  /**
   * What the count badge reports. A manual collection's draft IS the whole
   * membership, so its own length is exact. A smart one's grid is a preview
   * capped at `PREVIEW_LIMIT`, so it is only exact while the rules are
   * untouched and the server's derived count still describes them.
   */
  const rulesUnchanged =
    JSON.stringify(draft.ruleSet) === JSON.stringify(baseline.ruleSet) &&
    draft.type === baseline.type;
  const itemCount = (() => {
    if (draft.type === 'manual') {
      return itemsLoading ? (collection?.productCount ?? 0) : items.length;
    }
    return rulesUnchanged && collection ? collection.productCount : items.length;
  })();
  /** The grid is showing a sample, and saying so beats a silent cap. */
  const itemsTruncated = draft.type === 'smart' && items.length >= PREVIEW_LIMIT;

  /* --- how products get chosen ---------------------------------------------- */

  /** Adding a condition makes the collection automated; hand-picks do not survive. */
  const addRule = (rule: CollectionRule) =>
    setDraft((current) => ({
      ...current,
      type: 'smart',
      products: [],
      // A smart collection has no dragged positions; without this the sort
      // showed one order and saved another.
      sortOrder: current.sortOrder === 'manual' ? 'created-desc' : current.sortOrder,
      ruleSet: {
        ...current.ruleSet,
        rules: current.type === 'smart' ? [...current.ruleSet.rules, rule] : [rule],
      },
    }));

  const requestRule = (rule: CollectionRule) => {
    if (draft.type === 'manual' && draft.products.length > 0) {
      setPendingSwitch({ kind: 'condition', rule });
      return;
    }
    addRule(rule);
  };

  /** Picking products by hand makes the collection manual; conditions do not survive. */
  const addProducts = () => {
    setDraft((current) =>
      current.type === 'manual' ? current : { ...current, type: 'manual', ruleSet: emptyRuleSet() },
    );
    setPicking(true);
  };

  const requestProducts = () => {
    if (draft.type === 'smart' && rules.length > 0) {
      setPendingSwitch({ kind: 'products' });
      return;
    }
    addProducts();
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.products.length) return;
    const next = [...draft.products];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    patch({ products: next });
  };

  /* --- save ------------------------------------------------------------------ */

  const titleError = draft.title.trim() === '' ? 'Title is required' : undefined;
  const rulesError =
    draft.type === 'smart' && rules.length === 0
      ? 'Give every condition a value, or add products by hand instead.'
      : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const save = async () => {
    setSubmitted(true);
    setServerError(null);
    if (titleError || rulesError) return;

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: draft.title.trim(),
        descriptionHtml: draft.descriptionIsRich
          ? draft.description
          : textToHtml(draft.description),
        type: draft.type,
        sortOrder: draft.sortOrder,
        imageUrl: draft.imageUrl,
        // Always explicit: on a converted collection the server would otherwise
        // keep the stored rule set and refuse `manual` + conditions.
        ruleSet: draft.type === 'smart' ? { ...draft.ruleSet, rules } : null,
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
        const edit = membershipEdit(
          baseline.type === 'manual' ? baseline.products.map((p) => p.id) : [],
          draft.products.map((p) => p.id),
          draft.sortOrder === 'manual',
        );
        if (edit) {
          await apiFetch(`/admin/api/collections/${collection.id}/products`, {
            method: 'POST',
            body: edit,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.show('Collection saved');
      // Otherwise the next condition the merchant adds is marked incomplete
      // before they have typed a character, because this save left the form
      // in its "has been submitted" state.
      setSubmitted(false);

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

  const duplicate = async () => {
    if (!collection) return;
    const title = (duplicateTitle ?? '').trim();
    if (title === '') return;
    setDuplicateTitle(null);
    setSaving(true);
    try {
      // The SAVED collection is what is copied, not the unsaved draft — the
      // same thing "Duplicate" means everywhere else in the admin.
      const copy = await apiFetch<Collection>('/admin/api/collections', {
        method: 'POST',
        body: {
          title,
          descriptionHtml: collection.descriptionHtml,
          type: collection.type,
          sortOrder: collection.sortOrder,
          imageUrl: collection.imageUrl,
          ruleSet: collection.type === 'smart' ? collection.ruleSet : null,
          ...(collection.type === 'manual'
            ? { productIds: baseline.products.map((p) => p.id) }
            : {}),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.show('Collection duplicated');
      router.push(`/store/${slug}/collections/${copy.id}`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
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
          ? [
              {
                content: 'Duplicate',
                // The copy carries `baseline.products`, which is empty until
                // the members land — duplicating before then would silently
                // produce an empty collection.
                disabled: collection.type === 'manual' && members.isPending,
                onAction: () => setDuplicateTitle(`${collection.title} copy`),
              },
              {
                content: 'View',
                url: previewUrl({
                  shopSlug: slug,
                  page: 'collection',
                  collectionHandle: collection.handle,
                }),
                external: true,
                // `external` alone is not enough: the shell's `PolarisLink`
                // spreads Polaris's props AFTER its own `target="_blank"`, so
                // an undefined `target` erases it and the storefront would
                // replace the admin in the same tab.
                target: '_blank',
              },
            ]
          : undefined
      }
      actionGroups={
        collection
          ? [
              {
                title: 'More actions',
                actions: [
                  {
                    content: 'Delete',
                    destructive: true,
                    onAction: () => setConfirmingDelete(true),
                  },
                ],
              },
            ]
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
            <CollectionHeaderCard
              title={draft.title}
              description={draft.description}
              descriptionIsRich={draft.descriptionIsRich}
              imageUrl={draft.imageUrl}
              titleError={submitted ? titleError : undefined}
              onTitle={(title) => patch({ title })}
              onDescription={(description) => patch({ description })}
              onImage={(imageUrl) => patch({ imageUrl })}
            />

            <CollectionItemsCard
              items={items}
              count={itemCount}
              truncated={itemsTruncated}
              loading={itemsLoading}
              error={preview.error?.message}
              type={draft.type}
              ruleSet={draft.ruleSet}
              currencyCode={currencyCode}
              rulesError={submitted ? rulesError : undefined}
              onRuleSet={(ruleSet) => patch({ ruleSet })}
              // Positions only decide anything under `Manually`; offering the
              // arrows under any other sort would be a control that lies.
              onMove={draft.type === 'manual' && draft.sortOrder === 'manual' ? move : undefined}
              onRemove={
                draft.type === 'manual'
                  ? (id) => patch({ products: draft.products.filter((p) => p.id !== id) })
                  : undefined
              }
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <ProductsRail
              type={draft.type}
              sortOrder={draft.sortOrder}
              onSort={(sortOrder) => patch({ sortOrder })}
              onAddCondition={() => requestRule(newRule())}
              onAddProducts={requestProducts}
              // Shopify excludes named products; the closest thing our rule
              // model saves is a negated condition, so that is what this adds.
              onExclude={() =>
                requestRule({ column: 'title', relation: 'not_contains', condition: '' })
              }
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

      {picking ? (
        <ProductPickerModal
          open={picking}
          selected={draft.products}
          onClose={() => setPicking(false)}
          onDone={(products) => {
            patch({ products });
            setPicking(false);
          }}
        />
      ) : null}

      <Modal
        open={pendingSwitch !== null}
        onClose={() => setPendingSwitch(null)}
        title={
          pendingSwitch?.kind === 'products' ? 'Choose products yourself?' : 'Add a condition?'
        }
        primaryAction={{
          content: pendingSwitch?.kind === 'products' ? 'Add products' : 'Add condition',
          onAction: () => {
            const pending = pendingSwitch;
            setPendingSwitch(null);
            if (!pending) return;
            if (pending.kind === 'products') addProducts();
            else addRule(pending.rule);
          },
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setPendingSwitch(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            {pendingSwitch?.kind === 'products'
              ? 'This collection’s conditions will be removed and you’ll pick its products by hand.'
              : `Products will be chosen by condition instead. The ${draft.products.length} ${
                  draft.products.length === 1 ? 'product' : 'products'
                } added by hand will be removed from this collection.`}
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={duplicateTitle !== null}
        onClose={() => setDuplicateTitle(null)}
        title="Duplicate collection"
        primaryAction={{
          content: 'Duplicate collection',
          disabled: (duplicateTitle ?? '').trim() === '',
          onAction: duplicate,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDuplicateTitle(null) }]}
      >
        <Modal.Section>
          <TextField
            label="Title"
            autoComplete="off"
            autoFocus
            value={duplicateTitle ?? ''}
            onChange={setDuplicateTitle}
          />
        </Modal.Section>
      </Modal>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={`Delete ${collection?.title ?? 'collection'}?`}
        primaryAction={{ content: 'Delete', destructive: true, onAction: destroy }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(false) }]}
      >
        <Modal.Section>
          <Text as="p">This can’t be undone. The products in it are not deleted.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
