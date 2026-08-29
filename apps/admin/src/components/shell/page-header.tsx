'use client';

/**
 * The page header every admin page shares (docs/parity/admin-shell.md
 * § Page header). Owner: WS-A.
 *
 * Shopify's header is a breadcrumb, not a back-button + title: a small area
 * icon, then — on a detail page — a `›` chevron and the record's title, with
 * the actions right-aligned on the same row. Polaris `Page`'s `backAction`
 * renders the older arrow-button look instead, so pages keep `Page` for its
 * content width and render this as their first child:
 *
 *   <Page fullWidth>
 *     <PageHeader icon={ProductIcon} title="Products"
 *       actions={<Button variant="primary" url={...}>Add product</Button>} />
 *
 * On an index page pass the icon alone; on a detail page also pass `parent`,
 * which turns the icon into the link back to that index and adds the chevron.
 */
import { BlockStack, Box, Button, Icon, InlineStack, Text } from '@shopify/polaris';
import { ChevronRightIcon } from '@shopify/polaris-icons';

type IconSource = React.ComponentProps<typeof Icon>['source'];

/** Polaris `Icon` fills its container; a fixed box keeps the row's rhythm. */
function InlineIcon({ source, tone }: { source: IconSource; tone?: 'subdued' }) {
  return (
    <Box width="20px">
      <Icon source={source} tone={tone} />
    </Box>
  );
}

export function PageHeader({
  icon,
  title,
  titleMetadata,
  subtitle,
  parent,
  actions,
}: {
  /** The area's nav icon — `ProductIcon` on anything under Products. */
  icon: IconSource;
  title: string;
  /** Badges that sit inline after the title, as Polaris `Page` places them. */
  titleMetadata?: React.ReactNode;
  /** Subdued line under the title, as Polaris `Page` renders one. */
  subtitle?: string;
  /** Set on detail pages: the index this record belongs to. */
  parent?: { label: string; url: string };
  /** Right-aligned on the title row. Primary buttons are dark, never blue. */
  actions?: React.ReactNode;
}) {
  const row = (
    <InlineStack align="space-between" blockAlign="center" gap="200">
      <InlineStack gap="100" blockAlign="center">
        {parent ? (
          <>
            <Button
              variant="tertiary"
              icon={icon}
              url={parent.url}
              accessibilityLabel={parent.label}
            />
            <InlineIcon source={ChevronRightIcon} tone="subdued" />
          </>
        ) : (
          <Box paddingInlineEnd="100">
            <InlineIcon source={icon} />
          </Box>
        )}
        <Text as="h1" variant="headingLg" fontWeight="bold">
          {title}
        </Text>
        {titleMetadata}
      </InlineStack>
      {actions}
    </InlineStack>
  );

  if (!subtitle) return row;

  return (
    <BlockStack gap="100">
      {row}
      <Text as="p" variant="bodySm" tone="subdued">
        {subtitle}
      </Text>
    </BlockStack>
  );
}
