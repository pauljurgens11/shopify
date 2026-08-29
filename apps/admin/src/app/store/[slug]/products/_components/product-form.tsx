'use client';

/**
 * The product form (docs/parity/product-form.md). Owner: WS-B.
 *
 * The card ORDER is the load-bearing part — it is the main thing that makes the
 * page read as Shopify rather than as a form with the same fields:
 *
 *   left   Title+Description · Media · Price · Inventory · Shipping · Variants
 *          · Search engine listing
 *   right  Status · Publishing · Product organization
 *
 * Price, Inventory and Shipping are PRODUCT-level cards that edit the single
 * default variant, and they disappear the moment an option exists — from then
 * on those numbers are per-variant and live in the variants table. That is
 * exactly what Shopify does, and it is why "add a size" moves the price fields
 * instead of duplicating them.
 *
 * Category, Product metafields and Theme template are on the real page and not
 * here: SPEC §2 cuts metafields and tax providers, and we have one product
 * template, so all three would be controls that cannot change anything
 * (CLAUDE.md §8). Logged in DECISIONS.md.
 *
 * Saving is two steps on purpose. The product write carries everything except
 * stock; quantities then go through the inventory service, because that is the
 * only path that leaves an adjustment record behind (CLAUDE.md §9).
 */
import type { Paginated } from '@merchant/contracts/common';
import type { InventoryRow } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';
import type { Product } from '@merchant/contracts/products';
import type { IconProps } from '@shopify/polaris';
import {
  ActionList,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  Layout,
  Modal,
  Page,
  Popover,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import {
  ChannelsIcon,
  MenuHorizontalIcon,
  ProductIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../../components/shell/page-header.tsx';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import {
  draftFromProduct,
  draftToInput,
  emptyDraft,
  type ProductDraft,
  stockChanges,
  usableOptions,
  type VariantDraft,
  validate,
} from '../../../../../lib/product-draft.ts';
import {
  emptyStock,
  type StockByLocation,
  stockFromRows,
  stockLevelChanges,
} from '../../../../../lib/product-stock.ts';
import { InventoryCard } from './inventory-card.tsx';
import { MediaCard } from './media-card.tsx';
import { OrganizationCard } from './organization-card.tsx';
import { PricingCard } from './pricing-card.tsx';
import { RichTextField } from './rich-text-field.tsx';
import { SeoCard } from './seo-card.tsx';
import { ShippingCard } from './shipping-card.tsx';
import { VariantsCard } from './variants-card.tsx';

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

/** What each status actually means, the way the real select spells it out. */
const STATUS_HELP: Record<ProductDraft['status'], string> = {
  active: 'Sell via selected sales channels and markets',
  draft: 'Not visible on selected sales channels or markets',
  archived: 'Hidden from the admin and every sales channel',
};

/** Enough for the currencies the demo ships; falls back to the code itself. */
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

/**
 * Polaris `Icon` is `display:block; margin:auto`, so a bare one inside an
 * `InlineStack` centres itself in the leftover space instead of sitting next to
 * its label. Constraining the width kills the auto margins.
 */
function InlineIcon({ source }: { source: IconProps['source'] }) {
  return (
    <Box width="20px">
      <Icon source={source} tone="subdued" />
    </Box>
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
  const [menuOpen, setMenuOpen] = useState(false);

  const locations = useApiQuery<{ data: Location[] }>(['locations'], '/admin/api/locations');
  const locationList = useMemo(() => locations.data?.data ?? [], [locations.data]);
  const stockLocation = locationList[0];
  // Once options exist the quantities are per VARIANT and live in the variants
  // table, where a single field could only show the sum — editable there only
  // when one location makes that sum unambiguous (DECISIONS, WS-B).
  const stockEditable = locationList.length === 1;

  /**
   * The Inventory card's per-location quantities, kept beside the draft rather
   * than inside it: they arrive in their own request, after the draft is
   * seeded, so folding them in would either dirty an untouched form or discard
   * what the merchant had already typed. `baseline` is what the server last
   * confirmed, and the diff against it is what gets written.
   */
  const stockQuery = useApiQuery<Paginated<InventoryRow>>(
    ['product-stock', product?.id ?? 'new'],
    `/admin/api/inventory?limit=250&productId=${product?.id ?? ''}`,
    { enabled: Boolean(product) },
  );
  const [stock, setStock] = useState<StockByLocation>({});
  const [stockBaseline, setStockBaseline] = useState<StockByLocation>({});

  const defaultVariantId = product?.variants[0]?.id;
  const stockRows = stockQuery.data?.data;

  useEffect(() => {
    if (locationList.length === 0) return;
    // A brand-new product has nothing to fetch and starts everywhere at zero.
    if (!product) {
      const zeroed = emptyStock(locationList);
      setStock(zeroed);
      setStockBaseline(zeroed);
      return;
    }
    if (!stockRows) return;
    const seeded = stockFromRows(stockRows, locationList, defaultVariantId);
    setStock(seeded);
    setStockBaseline(seeded);
  }, [product, locationList, stockRows, defaultVariantId]);

  const errors = validate(draft);

  // The product-level cards edit the single default variant, and only exist
  // while there IS one — with options, every one of these is per-variant.
  const hasOptions = usableOptions(draft.options).length > 0;
  const defaultVariant = draft.variants[0];

  // Quantities count as unsaved changes too, but only while the card that
  // edits them is on screen.
  const stockDirty = !hasOptions && JSON.stringify(stock) !== JSON.stringify(stockBaseline);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || stockDirty;
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  const productsUrl = `/store/${slug}/products`;

  const patch = useCallback((changes: Partial<ProductDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  }, []);

  const patchDefaultVariant = useCallback((changes: Partial<VariantDraft>) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === 0 ? { ...variant, ...changes } : variant,
      ),
    }));
  }, []);

  const discard = () => {
    // A brand-new product has nothing to revert TO, so Discard leaves the page,
    // the way it does in Shopify. No confirmation for an untouched form.
    if (!product) {
      router.push(productsUrl);
      return;
    }
    setDraft(baseline);
    setStock(stockBaseline);
    setSubmitted(false);
    setServerError(null);
  };

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
      //
      // Two shapes, because two cards edit it. Without options the Inventory
      // card owns a cell per location and the diff is already per location.
      // With options the variants table shows one number per row, which is the
      // SUM across locations, so it is only writable when a single location
      // makes that sum unambiguous (DECISIONS, WS-B).
      const savedDefaultVariantId = saved.variants[0]?.id;
      const levels =
        !hasOptions && savedDefaultVariantId
          ? stockLevelChanges(stock, stockBaseline, savedDefaultVariantId)
          : stockEditable && stockLocation
            ? stockChanges(draft, saved).map((change) => ({
                ...change,
                locationId: stockLocation.id,
              }))
            : [];

      if (levels.length > 0) {
        await apiFetch('/admin/api/inventory/set', { method: 'POST', body: { levels } });
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.show('Product saved');

      if (product) {
        await queryClient.invalidateQueries({ queryKey: ['product', product.id] });
        await queryClient.invalidateQueries({ queryKey: ['product-stock', product.id] });
        setDraft(draftFromProduct(saved));
        setStockBaseline(stock);
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
      router.replace(productsUrl);
    } catch (cause) {
      toast.error((cause as ApiError).message);
      setSaving(false);
    }
  };

  return (
    <Page>
      <SaveBar
        dirty={dirty}
        saving={saving}
        message={product ? 'Unsaved changes' : 'Unsaved product'}
        onSave={save}
        onDiscard={discard}
      />

      <BlockStack gap="400">
        <PageHeader
          icon={ProductIcon}
          parent={{ label: 'Products', url: productsUrl }}
          title={product ? product.title : 'Add product'}
          actions={
            product ? (
              <Popover
                active={menuOpen}
                onClose={() => setMenuOpen(false)}
                activator={
                  <Button
                    variant="tertiary"
                    icon={MenuHorizontalIcon}
                    accessibilityLabel="More actions"
                    onClick={() => setMenuOpen((current) => !current)}
                  />
                }
              >
                <ActionList
                  items={[
                    {
                      content: 'Delete',
                      destructive: true,
                      onAction: () => {
                        setMenuOpen(false);
                        setConfirmingDelete(true);
                      },
                    },
                  ]}
                />
              </Popover>
            ) : null
          }
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
                  <RichTextField
                    label="Description"
                    value={draft.descriptionHtml}
                    onChange={(descriptionHtml) => patch({ descriptionHtml })}
                  />
                </BlockStack>
              </Card>

              <MediaCard images={draft.images} onChange={(images) => patch({ images })} />

              {hasOptions || !defaultVariant ? null : (
                <>
                  <PricingCard
                    variant={defaultVariant}
                    currencySymbol={currencySymbol}
                    error={submitted ? errors.price : undefined}
                    onChange={patchDefaultVariant}
                  />
                  <InventoryCard
                    variant={defaultVariant}
                    locations={locationList}
                    stock={stock}
                    onStockChange={setStock}
                    onChange={patchDefaultVariant}
                  />
                  <ShippingCard variant={defaultVariant} onChange={patchDefaultVariant} />
                </>
              )}

              <VariantsCard
                options={draft.options}
                variants={draft.variants}
                currencySymbol={currencySymbol}
                // Always the plain label: with several locations the value shown
                // is the sum across all of them, so naming one location would lie.
                stockLabel="Available"
                stockEditable={stockEditable}
                error={submitted ? errors.variants : undefined}
                onChange={({ options, variants }) => patch({ options, variants })}
              />

              <SeoCard slug={slug} draft={draft} onChange={patch} />

              {serverError ? (
                <Card>
                  <Text as="p" tone="critical">
                    {serverError}
                  </Text>
                </Card>
              ) : null}

              {/* Shopify pins a Save below the last card as well as in the save
                  bar; it is inert until there is something to save. */}
              <InlineStack align="end">
                <Button variant="primary" disabled={!dirty} loading={saving} onClick={save}>
                  Save
                </Button>
              </InlineStack>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  helpText={STATUS_HELP[draft.status]}
                  value={draft.status}
                  onChange={(status) => patch({ status: status as ProductDraft['status'] })}
                />
              </Card>

              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingSm">
                      Publishing
                    </Text>
                    <InlineIcon source={SettingsIcon} />
                  </InlineStack>
                  {/* One sales channel exists in this product (SPEC §2 — no
                      multi-channel), so this states the fact rather than
                      offering a picker that has nothing to pick. */}
                  <InlineStack gap="150" blockAlign="center">
                    <InlineIcon source={ChannelsIcon} />
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      Online Store
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <OrganizationCard draft={draft} onChange={patch} />
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

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
