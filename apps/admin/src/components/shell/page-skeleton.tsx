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
}: {
  lines?: number;
  /**
   * `detail` mirrors the detail/form pages — back arrow, main column plus a
   * oneThird sidebar — so the column structure doesn't change when content
   * lands (PARITY.md §Motion: skeleton → content swaps with zero layout shift).
   */
  layout?: 'single' | 'detail';
}) {
  if (layout === 'detail') {
    return (
      <SkeletonPage primaryAction backAction>
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
    <SkeletonPage primaryAction>
      <Card>
        <SkeletonBodyText lines={lines} />
      </Card>
    </SkeletonPage>
  );
}
