'use client';

/** Settings → Checkout (SPEC §9). Owner: WS-A. E3 reads these at checkout. */
import type { CheckoutSettings } from '@merchant/contracts/shops';
import { BlockStack, Card, Checkbox, FormLayout, Text, TextField } from '@shopify/polaris';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useSettingsForm } from '../../../../../components/settings/use-settings-form.ts';

export default function CheckoutSettingsPage() {
  const form = useSettingsForm<CheckoutSettings>(
    ['settings', 'checkout'],
    '/admin/api/settings/checkout',
    'Settings saved',
  );
  const value = form.value;

  return (
    <SettingsPage title="Checkout" loading={form.loading} form={form}>
      {value ? (
        <BlockStack gap="400">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Customer accounts
              </Text>
              <Checkbox
                label="Require an account to check out"
                helpText="Off lets customers check out as guests."
                checked={value.requireCustomerAccount}
                onChange={(requireCustomerAccount) => form.set({ requireCustomerAccount })}
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Order processing
              </Text>
              <FormLayout>
                <TextField
                  label="Order note prompt"
                  name="orderNotePrompt"
                  autoComplete="off"
                  placeholder="Add a note to your order"
                  helpText="Leave blank to hide the note field at checkout."
                  value={value.orderNotePrompt ?? ''}
                  onChange={(next) => form.set({ orderNotePrompt: next || null })}
                  error={form.error?.fieldErrors.orderNotePrompt}
                />
                <Checkbox
                  label="Ask for a tip at checkout"
                  checked={value.showTipping}
                  onChange={(showTipping) => form.set({ showTipping })}
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </BlockStack>
      ) : null}
    </SettingsPage>
  );
}
