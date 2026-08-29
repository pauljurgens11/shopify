'use client';

/**
 * The loading skeleton every admin page shares. Owner: WS-A.
 *
 * PARITY.md: "Skeleton page on load, never a spinner-only screen." Leaf pages
 * should render `<PageSkeleton />` while their query is pending rather than
 * inventing their own.
 */
import { BlockStack, Card, Layout, SkeletonBodyText, SkeletonPage } from '@shopify/polaris';

export function PageSkeleton({
  lines = 6,
  layout = 'single',
  fullWidth = false,
  primaryAction = false,
}: {
  lines?: number;
  /**
   * `detail` mirrors the detail/form pages — back arrow, main column plus a
   * oneThird sidebar — so the column structure doesn't change when content
   * lands (PARITY.md §Motion: skeleton → content swaps with zero layout shift).
   */
  layout?: 'single' | 'detail';
  /**
   * The seven index pages render `<Page fullWidth>`; their skeleton must match
   * or the content area visibly snaps from ~950px to full width when data
   * lands — the exact jump the full-width change was made to remove.
   */
  fullWidth?: boolean;
  /**
   * Only for a page whose real header has a top-right button. Polaris renders
   * this as a 100x36 grey block, so passing it where the loaded page has no
   * such button promises a button that never arrives and shifts the header
   * when the block disappears — Orders, Home and every save-bar form page.
   */
  primaryAction?: boolean;
}) {
  if (layout === 'detail') {
    return (
      <SkeletonPage primaryAction={primaryAction} backAction>
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <SkeletonBodyText lines={lines} />
              </Card>
              <Card>
                <SkeletonBodyText lines={4} />
              </Card>
            </BlockStack>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <SkeletonBodyText lines={3} />
              </Card>
              <Card>
                <SkeletonBodyText lines={3} />
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  return (
    <SkeletonPage primaryAction={primaryAction} fullWidth={fullWidth}>
      <Card>
        <SkeletonBodyText lines={lines} />
      </Card>
    </SkeletonPage>
  );
}
