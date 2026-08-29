'use client';

/**
 * The centred, subdued help link Shopify puts under every index card
 * (docs/parity/admin-shell.md § Footer line). Owner: WS-A.
 *
 *   <LearnMore resource="orders" href="https://help.shopify.com/manual/orders" />
 *
 * The href is a real destination, not a placeholder: a link that goes nowhere
 * is the dead control CLAUDE.md §8 rules out, and the pages it points at are
 * the ones the real admin points at.
 */
import { Box, InlineStack, Link, Text } from '@shopify/polaris';

/** Where each index's footer link goes, keyed by the resource it names. */
export const HELP_URLS = {
  orders: 'https://help.shopify.com/manual/orders',
  products: 'https://help.shopify.com/manual/products',
  collections: 'https://help.shopify.com/manual/products/collections',
  customers: 'https://help.shopify.com/manual/customers',
  discounts: 'https://help.shopify.com/manual/discounts',
  inventory: 'https://help.shopify.com/manual/products/inventory',
  apps: 'https://help.shopify.com/manual/apps',
} as const;

export type HelpResource = keyof typeof HELP_URLS;

export function LearnMore({ resource }: { resource: HelpResource }) {
  return (
    <Box paddingBlockStart="400" paddingBlockEnd="400">
      <InlineStack align="center">
        {/* `Text` inside the link, not around it: the capture's footer link is
            subdued, and Polaris `Link` paints its own colour on the anchor. */}
        <Link url={HELP_URLS[resource]} target="_blank" removeUnderline>
          <Text as="span" variant="bodySm" tone="subdued">
            Learn more about {resource}
          </Text>
        </Link>
      </InlineStack>
    </Box>
  );
}
