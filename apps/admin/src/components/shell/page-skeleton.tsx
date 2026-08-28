'use client';

/**
 * Loading and placeholder scaffolding every admin page shares. Owner: WS-A.
 *
 * PARITY.md: "Skeleton page on load, never a spinner-only screen." Leaf pages
 * should render `<PageSkeleton />` while their query is pending rather than
 * inventing their own.
 */
import {
  BlockStack,
  Box,
  Card,
  Page,
  SkeletonBodyText,
  SkeletonPage,
  Text,
} from '@shopify/polaris';

export function PageSkeleton({ lines = 6 }: { lines?: number }) {
  return (
    <SkeletonPage primaryAction>
      <Card>
        <SkeletonBodyText lines={lines} />
      </Card>
    </SkeletonPage>
  );
}

/**
 * A nav destination whose issue has not landed yet. A dead nav item is a KPI
 * failure, so every destination renders something real; leaf issues replace
 * this with the actual page.
 */
export function ComingOnline({ title, description }: { title: string; description: string }) {
  return (
    <Page title={title}>
      <Card>
        {/* Polaris EmptyState requires an `image`, and passing "" renders an
            <img src=""> that the browser resolves against the page URL — a
            phantom request and a 404 in the console. Plain primitives instead. */}
        <Box padding="800">
          <BlockStack gap="200" inlineAlign="center">
            <Text as="h2" variant="headingMd">
              {title} is coming online
            </Text>
            <Text as="p" tone="subdued" alignment="center">
              {description}
            </Text>
          </BlockStack>
        </Box>
      </Card>
    </Page>
  );
}
