'use client';

/** Settings → General (SPEC §9). Owner: WS-A. */
import type { GeneralSettings } from '@merchant/contracts/shops';
import { BlockStack, Card, FormLayout, Select, Text, TextField } from '@shopify/polaris';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useSettingsForm } from '../../../../../components/settings/use-settings-form.ts';

// The common ones; a full tz database picker is not what this demo is about.
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function GeneralSettingsPage() {
  const form = useSettingsForm<GeneralSettings>(
    ['settings', 'general'],
    '/admin/api/settings/general',
    'Settings saved',
  );
  const value = form.value;

  return (
    <SettingsPage title="General" loading={form.loading} form={form}>
      {value ? (
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Store details
              </Text>
              <FormLayout>
                <TextField
                  label="Store name"
                  name="name"
                  autoComplete="organization"
                  value={value.name}
                  onChange={(name) => form.set({ name })}
                  error={form.error?.fieldErrors.name}
                />
                <TextField
                  label="Store contact email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  helpText="Customer order emails are sent from this address."
                  value={value.email ?? ''}
                  onChange={(email) => form.set({ email: email || null })}
                  error={form.error?.fieldErrors.email}
                />
              </FormLayout>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Store defaults
              </Text>
              <FormLayout>
                {/* Currency is fixed per shop (SPEC §2, no multi-currency) and
                    every amount already stored is in it, so it is shown, not edited. */}
                <TextField
                  label="Store currency"
                  name="currencyCode"
                  autoComplete="off"
                  value={value.currencyCode}
                  disabled
                  helpText="Set when the store was created and cannot be changed."
                  onChange={() => {}}
                />
                <Select
                  label="Time zone"
                  options={TIMEZONES.map((zone) => ({ label: zone, value: zone }))}
                  value={value.timezone}
                  onChange={(timezone) => form.set({ timezone })}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </BlockStack>
      ) : null}
    </SettingsPage>
  );
}
