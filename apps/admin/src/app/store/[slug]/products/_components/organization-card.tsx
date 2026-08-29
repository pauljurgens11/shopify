'use client';

/**
 * The right rail's Product organization card — Type, Vendor, Collections, Tags
 * (docs/parity/product-form.md → right rail card 3). Owner: WS-B (B5).
 *
 * All four are comboboxes over what the store already uses, because that is
 * what stops a catalogue growing "Outerwear", "outerwear" and "Outer wear".
 * The suggestion lists are fetched LAZILY, on the first interaction with one of
 * these controls: they cost a 250-product page, which no one should pay for
 * opening a product they only meant to rename.
 *
 * Collections offers MANUAL collections only. A smart collection selects its
 * products by rule and stores no membership (DECISIONS, WS-B/WS-E), so adding
 * a product to one here would write a row nothing reads.
 */
import type { Collection } from '@merchant/contracts/collections';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import {
  BlockStack,
  Box,
  Button,
  Card,
  Combobox,
  Icon,
  InlineStack,
  Listbox,
  Tag,
  Text,
  Tooltip,
} from '@shopify/polaris';
import { InfoIcon, PlusCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useApiQuery } from '../../../../../lib/api.ts';
import type { ProductDraft } from '../../../../../lib/product-draft.ts';

const matches = (candidate: string, query: string) =>
  candidate.toLowerCase().includes(query.trim().toLowerCase());

/** A free-text field that also offers what the catalogue already uses. */
function SuggestField({
  label,
  placeholder,
  value,
  suggestions,
  onChange,
  onOpen,
}: {
  label: string;
  placeholder: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  onOpen: () => void;
}) {
  const offered = suggestions.filter(
    (suggestion) => suggestion !== value && matches(suggestion, value),
  );

  return (
    <Combobox
      activator={
        <Combobox.TextField
          label={label}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onFocus={onOpen}
          onChange={onChange}
        />
      }
    >
      {offered.length === 0 ? null : (
        <Listbox onSelect={onChange}>
          {offered.slice(0, 20).map((suggestion) => (
            <Listbox.Option key={suggestion} value={suggestion}>
              {suggestion}
            </Listbox.Option>
          ))}
        </Listbox>
      )}
    </Combobox>
  );
}

/**
 * Shopify's `⊕ Add collections` / `⊕ Add tags`: a bordered button that becomes
 * a search field, with what is already chosen as chips above it.
 */
function AddablePicker({
  label,
  buttonLabel,
  placeholder,
  chips,
  options,
  allowNew,
  onAdd,
  onRemove,
  onOpen,
}: {
  label: string;
  buttonLabel: string;
  placeholder: string;
  chips: { id: string; label: string }[];
  options: { id: string; label: string }[];
  /** Tags may be invented; collections must already exist. */
  allowNew: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const chosen = new Set(chips.map((chip) => chip.id));
  const offered = options.filter(
    (option) => !chosen.has(option.id) && matches(option.label, query),
  );
  const typed = query.trim();
  const canInvent =
    allowNew &&
    typed !== '' &&
    !options.some((option) => option.label.toLowerCase() === typed.toLowerCase());

  const add = (id: string) => {
    onAdd(id);
    setQuery('');
  };

  return (
    <BlockStack gap="200">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>

      {chips.length > 0 ? (
        <InlineStack gap="100" wrap>
          {chips.map((chip) => (
            <Tag key={chip.id} onRemove={() => onRemove(chip.id)}>
              {chip.label}
            </Tag>
          ))}
        </InlineStack>
      ) : null}

      {open ? (
        <Combobox
          activator={
            <Combobox.TextField
              label={label}
              labelHidden
              autoComplete="off"
              autoFocus
              placeholder={placeholder}
              value={query}
              onChange={setQuery}
            />
          }
        >
          {offered.length === 0 && !canInvent ? null : (
            <Listbox onSelect={add}>
              {canInvent ? <Listbox.Action value={typed}>{`Add "${typed}"`}</Listbox.Action> : null}
              {offered.slice(0, 20).map((option) => (
                <Listbox.Option key={option.id} value={option.id}>
                  {option.label}
                </Listbox.Option>
              ))}
            </Listbox>
          )}
        </Combobox>
      ) : (
        <Button
          icon={PlusCircleIcon}
          textAlign="start"
          fullWidth
          onClick={() => {
            onOpen();
            setOpen(true);
          }}
        >
          {buttonLabel}
        </Button>
      )}
    </BlockStack>
  );
}

export function OrganizationCard({
  draft,
  onChange,
}: {
  draft: ProductDraft;
  onChange: (patch: Partial<ProductDraft>) => void;
}) {
  // Nothing is fetched until the merchant reaches for one of these controls.
  const [wanted, setWanted] = useState(false);
  const open = () => setWanted(true);

  const products = useApiQuery<Paginated<Product>>(
    ['product-facets'],
    '/admin/api/products?limit=250',
    { enabled: wanted },
  );
  // Also fetched unprompted when the product already belongs somewhere — the
  // chips need titles, and rendering "Collection" until someone clicks is worse
  // than one small request.
  const collections = useApiQuery<Paginated<Collection>>(
    ['collection-options'],
    '/admin/api/collections?limit=250&type=manual',
    { enabled: wanted || draft.collectionIds.length > 0 },
  );

  const rows = products.data?.data ?? [];
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => !!value && value.trim() !== ''))].sort(
      (a, b) => a.localeCompare(b),
    );

  const collectionOptions = (collections.data?.data ?? []).map((collection) => ({
    id: collection.id,
    label: collection.title,
  }));
  // A product loaded before the options arrive still names its collections:
  // fall back to the id so a chip never renders blank.
  const byId = new Map(collectionOptions.map((option) => [option.id, option.label]));

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            Product organization
          </Text>
          <Tooltip content="Type, vendor, collections and tags are how this product is found in the admin and grouped on the storefront.">
            {/* Boxed: a bare Polaris Icon is `margin:auto` and drifts to the
                middle of a flex row (see InlineIcon in product-form.tsx). */}
            <Box width="20px">
              <Icon source={InfoIcon} tone="subdued" />
            </Box>
          </Tooltip>
        </InlineStack>

        <SuggestField
          label="Type"
          placeholder="Search or add product type"
          value={draft.productType}
          suggestions={distinct(rows.map((row) => row.productType))}
          onOpen={open}
          onChange={(productType) => onChange({ productType })}
        />

        <SuggestField
          label="Vendor"
          placeholder="Search or add vendor"
          value={draft.vendor}
          suggestions={distinct(rows.map((row) => row.vendor))}
          onOpen={open}
          onChange={(vendor) => onChange({ vendor })}
        />

        <AddablePicker
          label="Collections"
          buttonLabel="Add collections"
          placeholder="Search or add collections"
          allowNew={false}
          chips={draft.collectionIds.map((id) => ({ id, label: byId.get(id) ?? 'Collection' }))}
          options={collectionOptions}
          onOpen={open}
          onAdd={(id) => onChange({ collectionIds: [...draft.collectionIds, id] })}
          onRemove={(id) =>
            onChange({ collectionIds: draft.collectionIds.filter((current) => current !== id) })
          }
        />

        <AddablePicker
          label="Tags"
          buttonLabel="Add tags"
          placeholder="Search or add tags"
          allowNew
          chips={draft.tags.map((tag) => ({ id: tag, label: tag }))}
          options={distinct(rows.flatMap((row) => row.tags)).map((tag) => ({
            id: tag,
            label: tag,
          }))}
          onOpen={open}
          onAdd={(tag) =>
            onChange({
              tags: draft.tags.some((current) => current.toLowerCase() === tag.toLowerCase())
                ? draft.tags
                : [...draft.tags, tag],
            })
          }
          onRemove={(tag) => onChange({ tags: draft.tags.filter((current) => current !== tag) })}
        />
      </BlockStack>
    </Card>
  );
}
