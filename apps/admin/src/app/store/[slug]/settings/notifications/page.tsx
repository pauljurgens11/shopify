'use client';

/**
 * Settings → Notifications (notifications-lite, SPEC §2). Owner: WS-A.
 *
 * Read-mostly on purpose: the customer emails this build actually sends are
 * the order confirmation, and its sender is the store contact email. The one
 * live control is the sender address, which G1's mailer reads.
 */
import type { GeneralSettings } from '@merchant/contracts/shops';
import {
  Badge,
  BlockStack,
  Card,
  FormLayout,
  InlineStack,
  Text,
  TextField,
} from '@shopify/polaris';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useSettingsForm } from '../../../../../components/settings/use-settings-form.ts';

/** What the storefront and worker actually send today. */
const NOTIFICATIONS = [
  {
    title: 'Order confirmation',
    description: 'Sent when a customer completes checkout.',
    live: true,
  },
  { title: 'Shipping confirmation', description: 'Sent when an order is fulfilled.', live: false },
  { title: 'Refund notification', description: 'Sent when an order is refunded.', live: false },
];

export default function NotificationSettingsPage() {
  const form = useSettingsForm<GeneralSettings>(
    ['settings', 'general'],
    '/admin/api/settings/general',
    'Settings saved',
  );
  const value = form.value;

  return (
    <SettingsPage title="Notifications" loading={form.loading} form={form}>
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Sender email
            </Text>
            <FormLayout>
              <TextField
                label="Customer emails are sent from"
                name="email"
                type="email"
                autoComplete="email"
                value={value?.email ?? ''}
                onChange={(email) => form.set({ email: email || null })}
                error={form.error?.fieldErrors.email}
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Customer notifications
            </Text>
            <BlockStack gap="300">
              {NOTIFICATIONS.map((notification) => (
                <InlineStack key={notification.title} align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">
                      {notification.title}
                    </Text>
                    <Text as="span" tone="subdued">
                      {notification.description}
                    </Text>
                  </BlockStack>
                  <Badge tone={notification.live ? 'success' : undefined}>
                    {notification.live ? 'On' : 'Off'}
                  </Badge>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </SettingsPage>
  );
}
