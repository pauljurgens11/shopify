'use client';

/**
 * The page header every admin page shares: an area icon, a `›` chevron on a
 * detail page, then the title, with the page's actions right-aligned on the
 * same row. Owner: WS-A (shell).
 *
 * Every parity capture shows this shape — index pages carry the icon and title
 * alone (`⊘ Products`, `⊟ Orders`), detail pages add the chevron and the
 * record's name (docs/parity/admin-shell.md § Page header, and every
 * docs/parity/*.md "Page chrome"). Polaris `Page`'s `backAction` renders the
 * OLDER arrow-button look instead, so the header is hand-built here and `Page`
 * is used only for its content width. It lives in the shell rather than in one
 * workstream's `_components` so the pages cannot drift apart from each other.
 *
 * Omit `backUrl` for an index page; pass it and the icon becomes the link back
 * to that index.
 */
import { BlockStack, Button, Icon, type IconProps, InlineStack, Text } from '@shopify/polaris';
import { ChevronRightIcon } from '@shopify/polaris-icons';
import type { ReactNode } from 'react';

/**
 * Polaris `Icon` is `display:block; margin:auto`, so a bare one inside an
 * `InlineStack` centres itself in the leftover space instead of sitting next to
 * its label. Constraining the width kills the auto margins.
 */
export function InlineIcon({ source }: { source: IconProps['source'] }) {
  return (
    <div style={{ width: '20px' }}>
      <Icon source={source} tone="subdued" />
    </div>
  );
}

export function PageBreadcrumb({
  icon,
  backUrl,
  backLabel,
  title,
  titleMetadata,
  subtitle,
  actions,
}: {
  /** The area's icon — the same glyph the nav uses for that section. */
  icon: IconProps['source'];
  /** Detail pages only: the index this record belongs to. */
  backUrl?: string;
  /** Read out for the icon button; the crumb itself is icon-only, as Shopify's is. */
  backLabel?: string;
  title: string;
  /** Badges that sit inline after the title, where Polaris `Page` puts them. */
  titleMetadata?: ReactNode;
  /** Subdued line under the title, as Polaris `Page` renders one. */
  subtitle?: string;
  actions?: ReactNode;
}) {
  const row = (
    <InlineStack align="space-between" blockAlign="center" gap="200">
      <InlineStack gap="100" blockAlign="center">
        {backUrl ? (
          <>
            <Button variant="tertiary" icon={icon} url={backUrl} accessibilityLabel={backLabel} />
            <InlineIcon source={ChevronRightIcon} />
          </>
        ) : (
          // No link: on an index page the icon names the area you are already in.
          <div style={{ paddingInlineEnd: 'var(--p-space-100)' }}>
            <InlineIcon source={icon} />
          </div>
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
