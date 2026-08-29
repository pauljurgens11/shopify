'use client';

/**
 * The pieces every admin index page shares (docs/parity/index-tables.md).
 * Owner: WS-B, used by every workstream's index.
 *
 * Three things live here because getting them inconsistent is exactly the tell
 * the parity capture describes:
 *
 *   - THE THREE EMPTY STATES. Shopify uses different furniture for "you have
 *     none yet" (illustrated, one primary button), "this is a promo surface"
 *     (Products — left-aligned block) and "your filter matched nothing"
 *     (quiet, a magnifier, and NO button). Reusing the first for the third is
 *     the specific mistake the capture calls out: an index must never invite
 *     you to add your first product because a search matched nothing.
 *   - THE FOOTER LINK. Every index ends with a centred, subdued
 *     `Learn more about <resource>` under the card.
 *   - THE SKELETON. Chrome first, skeleton only the data region — the header,
 *     the card and the filter row render immediately and only the table body
 *     is grey. Shopify never blanks the page.
 */
import {
  BlockStack,
  Box,
  Button,
  Icon,
  InlineStack,
  Link,
  SkeletonBodyText,
  SkeletonThumbnail,
  Text,
} from '@shopify/polaris';
import { SearchIcon } from '@shopify/polaris-icons';
import type { ReactNode } from 'react';

/**
 * Kind A — "you have none of these yet".
 *
 * Centred in the card with generous vertical padding, one primary button.
 * Hand-built rather than Polaris `EmptyState`, which requires an `image`: the
 * only on-brand illustrations are Shopify's own CDN assets and the parity
 * README forbids rendering those (the call WS-A and WS-B already logged).
 */
export function IndexEmptyState({
  heading,
  body,
  action,
  children,
}: {
  heading: string;
  body: ReactNode;
  action?: { content: string; url?: string; onAction?: () => void };
  /** For an action that is not a plain button — Discounts' create menu. */
  children?: ReactNode;
}) {
  return (
    <Box paddingBlock="1600" paddingInline="800">
      <BlockStack gap="200" inlineAlign="center">
        <Text as="h2" variant="headingMd">
          {heading}
        </Text>
        <Box maxWidth="480px">
          <Text as="p" tone="subdued" alignment="center">
            {body}
          </Text>
        </Box>
        {action || children ? (
          <Box paddingBlockStart="300">
            {action ? (
              <Button variant="primary" url={action.url} onClick={action.onAction}>
                {action.content}
              </Button>
            ) : (
              children
            )}
          </Box>
        ) : null}
      </BlockStack>
    </Box>
  );
}

/**
 * Kind B — the Products index's split promo state: a LEFT-aligned text block
 * with the buttons under it, not the centred column the other indexes use.
 */
export function IndexPromoEmptyState({
  heading,
  body,
  action,
}: {
  heading: string;
  body: string;
  action: { content: string; url: string };
}) {
  return (
    <Box paddingBlock="1200" paddingInline="800">
      <Box maxWidth="460px">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            {heading}
          </Text>
          <Text as="p" tone="subdued">
            {body}
          </Text>
          <Box paddingBlockStart="300">
            <InlineStack gap="200">
              <Button variant="primary" url={action.url}>
                {action.content}
              </Button>
            </InlineStack>
          </Box>
        </BlockStack>
      </Box>
    </Box>
  );
}

/**
 * Kind C — "your filter matched nothing". Small and quiet: a magnifier, a
 * heading, one subdued line, and deliberately NO button.
 */
export function IndexNoMatchState({ heading, body }: { heading: string; body: string }) {
  return (
    <Box paddingBlock="1000" paddingInline="500">
      <BlockStack gap="150" inlineAlign="center">
        <Icon source={SearchIcon} tone="subdued" />
        <Text as="h3" variant="headingSm">
          {heading}
        </Text>
        <Box maxWidth="380px">
          <Text as="p" tone="subdued" alignment="center">
            {body}
          </Text>
        </Box>
      </BlockStack>
    </Box>
  );
}

/**
 * The centred `Learn more about <resource>` line under every index card.
 *
 * It points at Shopify's own help centre, which is where the real link goes
 * and the only honest destination we have — this clone ships no help content
 * of its own, and a link that goes nowhere is worse than none (CLAUDE.md §8).
 */
export function IndexFooterHelp({ resource, topic }: { resource: string; topic: string }) {
  return (
    <Box paddingBlock="500">
      <Text as="p" tone="subdued" alignment="center" variant="bodySm">
        Learn more about{' '}
        <Link url={`https://help.shopify.com/manual/${topic}`} target="_blank">
          {resource}
        </Link>
      </Text>
    </Box>
  );
}

/**
 * The table body while the first page is in flight — grey rows inside a card
 * whose header, tabs and filter row have already rendered.
 *
 * Passed as the `IndexTable`'s `emptyState`, so the swap from skeleton to rows
 * happens inside the same card with no layout jump (PARITY §Motion).
 */
export function IndexTableSkeleton({
  rows = 5,
  media = false,
}: {
  rows?: number;
  /** Products/Collections rows lead with a thumbnail; Orders/Customers do not. */
  media?: boolean;
}) {
  return (
    <Box paddingBlock="200">
      <BlockStack gap="0">
        {Array.from({ length: rows }, (_, index) => (
          <Box
            // Fixed-length placeholder list: nothing here is reorderable and
            // there is no id to key on.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={`skeleton-row-${index}`}
            paddingBlock="300"
            paddingInline="400"
            borderBlockStartWidth={index === 0 ? '0' : '025'}
            borderColor="border"
          >
            <InlineStack gap="400" blockAlign="center" wrap={false}>
              {media ? <SkeletonThumbnail size="small" /> : null}
              <Box width="100%">
                <SkeletonBodyText lines={1} />
              </Box>
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Box>
  );
}
