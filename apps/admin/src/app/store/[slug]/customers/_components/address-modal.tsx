'use client';

/**
 * Add or edit one address, with the default toggle (C6). Owner: WS-C.
 *
 * Editing one address at a time rather than the whole list is Shopify's shape,
 * and it keeps the "exactly one default" rule where it belongs: the caller
 * hands the whole list back to the API, which normalises it (C4).
 */
import type { CustomerAddress } from '@merchant/contracts/customers';
import { Checkbox, FormLayout, Modal, Select, TextField } from '@shopify/polaris';
import { useEffect, useState } from 'react';

export type AddressDraft = Omit<CustomerAddress, 'id'>;

/** Enough countries for the demo; the storefront ships to these. */
const COUNTRIES = [
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Germany', value: 'DE' },
  { label: 'Australia', value: 'AU' },
];

const NAMES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((country) => [country.value, country.label]),
);

export const emptyAddress = (): AddressDraft => ({
  firstName: null,
  lastName: null,
  company: null,
  address1: '',
  address2: null,
  city: '',
  province: null,
  provinceCode: null,
  country: 'United States',
  countryCode: 'US',
  zip: '',
  phone: null,
  isDefault: false,
});

export function AddressModal({
  open,
  address,
  onClose,
  onSave,
  saving = false,
}: {
  open: boolean;
  address: AddressDraft | null;
  onClose: () => void;
  onSave: (address: AddressDraft) => void;
  saving?: boolean;
}) {
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress());

  // Reopening on a different address must not show the previous one's fields.
  useEffect(() => {
    if (open) setDraft(address ?? emptyAddress());
  }, [open, address]);

  const set = <K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={address ? 'Edit address' : 'Add address'}
      primaryAction={{
        content: 'Save',
        loading: saving,
        disabled: draft.address1.trim() === '' || draft.city.trim() === '',
        onAction: () => onSave(draft),
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>
          <FormLayout.Group>
            <TextField
              label="First name"
              autoComplete="given-name"
              value={draft.firstName ?? ''}
              onChange={(value) => set('firstName', value || null)}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              value={draft.lastName ?? ''}
              onChange={(value) => set('lastName', value || null)}
            />
          </FormLayout.Group>
          <TextField
            label="Company"
            autoComplete="organization"
            value={draft.company ?? ''}
            onChange={(value) => set('company', value || null)}
          />
          <TextField
            label="Address"
            autoComplete="address-line1"
            value={draft.address1}
            onChange={(value) => set('address1', value)}
          />
          <TextField
            label="Apartment, suite, etc."
            autoComplete="address-line2"
            value={draft.address2 ?? ''}
            onChange={(value) => set('address2', value || null)}
          />
          <FormLayout.Group>
            <TextField
              label="City"
              autoComplete="address-level2"
              value={draft.city}
              onChange={(value) => set('city', value)}
            />
            <TextField
              label="State / province"
              autoComplete="address-level1"
              value={draft.province ?? ''}
              onChange={(value) => set('province', value || null)}
            />
          </FormLayout.Group>
          <FormLayout.Group>
            <Select
              label="Country/region"
              options={COUNTRIES}
              value={draft.countryCode}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  countryCode: value,
                  country: NAMES[value] ?? value,
                }))
              }
            />
            <TextField
              label="ZIP / postal code"
              autoComplete="postal-code"
              value={draft.zip}
              onChange={(value) => set('zip', value)}
            />
          </FormLayout.Group>
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={draft.phone ?? ''}
            onChange={(value) => set('phone', value || null)}
          />
          <Checkbox
            label="Set as default address"
            checked={draft.isDefault}
            onChange={(value) => set('isDefault', value)}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
