'use client';

/**
 * The `Collection items` card (docs/parity/collection-detail.md → Left column 2).
 * Owner: WS-B (B6).
 *
 * The heading row is three parts on one line — heading, a count badge, then
 * subdued helper text — followed by a toolbar with a filter glyph on the right,
 * the applied-filter chip with `Clear all`, and then the product grid.
 *
 * The status filter is VIEW state, not draft state: it must not dirty the form
 * or survive a save, so it lives here rather than in the collection draft.
 *
 * Omitted deliberately (parity delta #6, SPEC.md §2): the `3 channels` control
 * and the grid/list/columns view-mode toggles. We are single-channel and have
 * one view — a cut feature's control is not rendered (CLAUDE.md §8).
 */
import type { CollectionRuleSet } from '@merchant/contracts/collections';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  ChoiceList,
  InlineStack,
  Popover,
  Tag,
  Text,
} from '@shopify/polaris';
import { FilterIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import {
  ALL_STATUSES,
  type ProductStatus,
  STATUS_CHOICES,
  statusChipLabel,
} from '../../../../../lib/collection-edits.ts';
import { completeRules } from '../../../../../lib/collection-rules.ts';
import {
  type CollectionItem,
  CollectionItemGrid,
  CollectionItemGridSkeleton,
} from './collection-items.tsx';
import { RulesBuilder } from './rules-builder.tsx';

export function CollectionItemsCard({
  items,
  count,
  truncated,
  loading,
  error,
  type,
  ruleSet,
  currencyCode,
  rulesError,
  onRuleSet,
  onMove,
  onRemove,
}: {
  /** Unfiltered — the status filter is applied here, not by the caller. */
  items: CollectionItem[];
  /**
   * What the badge reports: the collection, not the view, and not `items`
   * either — while the grid is loading, `items` is empty and the saved count is
   * the only honest number.
   */
  count: number;
  /** The grid holds only the first page of a large automated collection. */
  truncated?: boolean;
  loading: boolean;
  /** The preview request failed — say so where the grid would have been. */
  error?: string;
  type: 'manual' | 'smart';
  ruleSet: CollectionRuleSet;
  currencyCode: string;
  rulesError?: string;
  onRuleSet: (ruleSet: CollectionRuleSet) => void;
  /** Manual collections only — a smart one's order comes from the sort. */
  onMove?: (from: number, to: number) => void;
  onRemove?: (id: string) => void;
}) {
  // Shopify's collection-items view arrives with the status filter already
  // applied, so the chip is present by default; `null` is the cleared state.
  const [statuses, setStatuses] = useState<ProductStatus[] | null>(ALL_STATUSES);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = statuses ? items.filter((item) => statuses.includes(item.status)) : items;
  const hasConditions = type === 'smart' && completeRules(ruleSet.rules).length > 0;

  const body = () => {
    if (loading) return <CollectionItemGridSkeleton />;
    if (error) {
      return (
        <Text as="p" tone="critical">
          {error}
        </Text>
      );
    }
    if (type === 'smart' && !hasConditions) {
      return (
        <Text as="p" tone="subdued">
          Add a condition to see which products match.
        </Text>
      );
    }
    if (visible.length > 0) {
      return (
        <BlockStack gap="300">
          <CollectionItemGrid items={visible} onMove={onMove} onRemove={onRemove} />
          {truncated ? (
            <Text as="p" variant="bodySm" tone="subdued">
              Showing the first {visible.length} products.
            </Text>
          ) : null}
        </BlockStack>
      );
    }
    if (items.length > 0) {
      return (
        <Text as="p" tone="subdued">
          No products match these filters.
        </Text>
      );
    }
    // An empty collection says so in the heading row's helper text; Shopify
    // shows no second empty state under the toolbar.
    return null;
  };

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <Text as="h2" variant="headingSm">
            Collection items
          </Text>
          <Badge>{String(count)}</Badge>
          {!loading && count === 0 ? (
            <Text as="span" variant="bodySm" tone="subdued">
              Add conditions or products to populate your collection
            </Text>
          ) : null}
        </InlineStack>

        {type === 'smart' ? (
          <RulesBuilder
            ruleSet={ruleSet}
            currencyCode={currencyCode}
            error={rulesError}
            onChange={onRuleSet}
          />
        ) : null}

        <InlineStack align="end" blockAlign="center">
          <Popover
            active={filterOpen}
            preferredAlignment="right"
            onClose={() => setFilterOpen(false)}
            activator={
              <Button
                variant="tertiary"
                icon={FilterIcon}
                accessibilityLabel="Filter collection items"
                onClick={() => setFilterOpen((open) => !open)}
              />
            }
          >
            <Box padding="300" minWidth="180px">
              <ChoiceList
                title="Status"
                allowMultiple
                choices={STATUS_CHOICES}
                selected={statuses ?? []}
                onChange={(selected) =>
                  // Unchecking everything removes the filter rather than
                  // hiding every product — Shopify's filter behaves that way.
                  setStatuses(selected.length === 0 ? null : (selected as ProductStatus[]))
                }
              />
            </Box>
          </Popover>
        </InlineStack>

        {statuses ? (
          <InlineStack gap="200" blockAlign="center">
            <Tag onRemove={() => setStatuses(null)}>{statusChipLabel(statuses)}</Tag>
            <Button variant="plain" onClick={() => setStatuses(null)}>
              Clear all
            </Button>
          </InlineStack>
        ) : null}

        {body()}
      </BlockStack>
    </Card>
  );
}
