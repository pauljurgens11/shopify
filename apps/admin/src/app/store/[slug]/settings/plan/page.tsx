'use client';

/**
 * Settings → Plan. Owner: WS-A.
 *
 * Render, do not build billing (A4). There is no plan change flow because
 * there is no billing in this build; showing a fake upgrade button would be
 * worse than showing none (CLAUDE.md §8).
 */
import { Badge, BlockStack, Card, InlineStack, List, Text } from '@shopify/polaris';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useSession } from '../../../../../lib/session.ts';

export default function PlanSettingsPage() {
  const { data: session } = useSession();

  return (
    <SettingsPage title="Plan" loading={!session}>
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                {session?.shop.name}
              </Text>
              <Text as="p" tone="subdued">
                You are on a trial of Merchant.
              </Text>
            </BlockStack>
            <Badge tone="success">Trial</Badge>
          </InlineStack>

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              What is included
            </Text>
            <List>
              <List.Item>Unlimited products, collections and orders</List.Item>
              <List.Item>Your storefront, built and published from the admin</List.Item>
              <List.Item>Card payments through your own processors</List.Item>
              <List.Item>Staff accounts with per-area permissions</List.Item>
            </List>
          </BlockStack>
        </BlockStack>
      </Card>
    </SettingsPage>
  );
}
