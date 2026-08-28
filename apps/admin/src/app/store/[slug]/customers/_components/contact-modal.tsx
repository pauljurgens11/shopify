'use client';

/**
 * Edit a customer's name, email and phone (C6). Owner: WS-C.
 *
 * Shopify edits contact details in a modal off the Customer card rather than
 * inline — the fields are identity, not preferences, so they save immediately
 * instead of riding the page's contextual save bar. The caller owns the PUT;
 * a duplicate-email 409 comes back through `emailError` onto the field itself.
 */
import type { Customer } from '@merchant/contracts/customers';
import { FormLayout, Modal, TextField } from '@shopify/polaris';
import { useEffect, useState } from 'react';

export type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export function ContactModal({
  open,
  customer,
  saving,
  emailError,
  onEmailEdit,
  onClose,
  onSave,
}: {
  open: boolean;
  customer: Customer;
  saving: boolean;
  emailError?: string;
  /** Clears a stale duplicate-email error the moment the field changes. */
  onEmailEdit: () => void;
  onClose: () => void;
  onSave: (draft: ContactDraft) => void;
}) {
  const [draft, setDraft] = useState<ContactDraft>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Reopening must show the current values, not the last abandoned edit.
  useEffect(() => {
    if (open) {
      setDraft({
        firstName: customer.firstName ?? '',
        lastName: customer.lastName ?? '',
        email: customer.email,
        phone: customer.phone ?? '',
      });
    }
  }, [open, customer]);

  const set = <K extends keyof ContactDraft>(key: K, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit contact information"
      primaryAction={{
        content: 'Save',
        loading: saving,
        disabled: draft.email.trim() === '',
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
              value={draft.firstName}
              onChange={(value) => set('firstName', value)}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              value={draft.lastName}
              onChange={(value) => set('lastName', value)}
            />
          </FormLayout.Group>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={draft.email}
            onChange={(value) => {
              set('email', value);
              onEmailEdit();
            }}
            error={emailError}
          />
          <TextField
            label="Phone number"
            type="tel"
            autoComplete="tel"
            value={draft.phone}
            onChange={(value) => set('phone', value)}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
