'use client';

/**
 * Settings → Taxes (SPEC §10). Owner: WS-A.
 *
 * One flat percentage. Tax providers and per-region tables are a hard
 * out-of-scope stop (SPEC §2) — do not add a region table here.
 */
import type { TaxSettings } from '@merchant/contracts/shops';
import { BlockStack, Card, Checkbox, FormLayout, Text, TextField } from '@shopify/polaris';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useSettingsForm } from '../../../../../components/settings/use-settings-form.ts';

export default function TaxSettingsPage() {
  const form = useSettingsForm<TaxSettings>(
    ['settings', 'taxes'],
    '/admin/api/settings/taxes',
    'Settings saved',
  );
  const value = form.value;

  return (
    <SettingsPage title="Taxes" loading={form.loading} form={form}>
      {value ? (
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Tax rate
            </Text>
            <FormLayout>
              <TextField
                label="Sales tax"
                name="ratePercentage"
                type="number"
                suffix="%"
                min={0}
                max={100}
                step={0.001}
                autoComplete="off"
                helpText="Applied to every order at checkout."
                // A percentage, not an amount — the integer-minor-units rule
                // (SPEC §5) governs money, and this is not money.
                value={String(value.ratePercentage)}
                onChange={(next) => form.set({ ratePercentage: Number(next) || 0 })}
                error={form.error?.fieldErrors.ratePercentage}
              />
              <Checkbox
                label="All prices include tax"
                helpText="Show tax as part of the price rather than added at checkout."
                checked={value.pricesIncludeTax}
                onChange={(pricesIncludeTax) => form.set({ pricesIncludeTax })}
              />
            </FormLayout>
          </BlockStack>
        </Card>
      ) : null}
    </SettingsPage>
  );
}
