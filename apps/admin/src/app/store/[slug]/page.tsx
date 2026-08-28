'use client';

/**
 * Home — the first screen after login. Owner: WS-A until G3 replaces it.
 *
 * The greeting is PARITY.md's line for this page and costs nothing; the
 * onboarding guide and the metric cards below it are G3's, so this stops here
 * rather than half-building them.
 */
import { BlockStack, Card, Page, Text } from '@shopify/polaris';
import { useSession } from '../../../lib/session.ts';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <Page title={`${greeting(new Date().getHours())}, ${session.shop.name}`}>
      <Card>
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Your store is set up
          </Text>
          <Text as="p" tone="subdued">
            The onboarding guide and your sales at a glance appear here. Start with Products to add
            what you sell.
          </Text>
        </BlockStack>
      </Card>
    </Page>
  );
}
