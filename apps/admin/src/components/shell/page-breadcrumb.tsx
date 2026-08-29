'use client';

/**
 * The detail-page header: an area icon, a `›` chevron, then the title, with the
 * page's actions right-aligned on the same row. Owner: WS-A (shell).
 *
 * Every parity capture of a detail page shows this shape — product form,
 * collection detail, new customer (docs/parity/*.md → "Page chrome"). Polaris
 * `Page`'s `backAction` renders the OLDER arrow-button look instead, so the
 * header is hand-built here and `Page` is used only for its content width.
 * It lives in the shell rather than in one workstream's `_components` so the
 * detail pages cannot drift apart from each other.
 */
import { Button, Icon, type IconProps, InlineStack, Text } from '@shopify/polaris';
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
  actions,
}: {
  /** The area's icon — the same glyph the nav uses for that section. */
  icon: IconProps['source'];
  backUrl: string;
  /** Read out for the icon button; the crumb itself is icon-only, as Shopify's is. */
  backLabel: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <InlineStack align="space-between" blockAlign="center" gap="200">
      <InlineStack gap="100" blockAlign="center">
        <Button variant="tertiary" icon={icon} url={backUrl} accessibilityLabel={backLabel} />
        <InlineIcon source={ChevronRightIcon} />
        <Text as="h1" variant="headingLg" fontWeight="bold">
          {title}
        </Text>
      </InlineStack>
      {actions}
    </InlineStack>
  );
}
