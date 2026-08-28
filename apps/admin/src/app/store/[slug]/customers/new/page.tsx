'use client';

/**
 * Add customer (PARITY.md → Detail/form pages). Owner: WS-C (C6).
 *
 * Deliberately short: Shopify's own "Add customer" is contact details, marketing
 * consent and one optional address. Everything else on a customer — notes, tags,
 * more addresses — is edited on the detail page once they exist.
 */
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch } from '../../../../../lib/api.ts';
import { type AddressDraft, AddressModal } from '../_components/address-modal.tsx';

export default function NewCustomerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [address, setAddress] = useState<AddressDraft | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  const dirty =
    email !== '' || firstName !== '' || lastName !== '' || phone !== '' || address !== null;

  const save = async () => {
    setSaving(true);
    setEmailError(undefined);
    try {
      const created = await apiFetch<{ id: string }>('/admin/api/customers', {
        method: 'POST',
        body: {
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          acceptsMarketing,
          addresses: address ? [{ ...address, isDefault: true }] : [],
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.show('Customer created');
      router.push(`/store/${slug}/customers/${created.id}`);
    } catch (cause) {
      const error = cause as ApiError;
      // A duplicate email is the one failure worth showing on the field itself.
      if (error.field === 'email') setEmailError(error.message);
      else toast.error(error.message);
      setSaving(false);
    }
  };

  return (
    <Page
      backAction={{ content: 'Customers', url: `/store/${slug}/customers` }}
      title="New customer"
      narrowWidth
    >
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => router.push(`/store/${slug}/customers`)}
      />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Customer overview
                </Text>
                <FormLayout>
                  <FormLayout.Group>
                    <TextField
                      label="First name"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={setFirstName}
                    />
                    <TextField
                      label="Last name"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={setLastName}
                    />
                  </FormLayout.Group>
                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(value) => {
                      setEmail(value);
                      setEmailError(undefined);
                    }}
                    error={emailError}
                  />
                  <TextField
                    label="Phone number"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={setPhone}
                  />
                  <Checkbox
                    label="Customer accepts email marketing"
                    checked={acceptsMarketing}
                    onChange={setAcceptsMarketing}
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Default address
                </Text>
                {address ? (
                  <BlockStack gap="100">
                    <Text as="p">{address.address1}</Text>
                    <Text as="p">
                      {[address.city, address.province, address.zip].filter(Boolean).join(' ')}
                    </Text>
                    <Text as="p">{address.country}</Text>
                  </BlockStack>
                ) : (
                  <Text as="p" tone="subdued">
                    No address yet.
                  </Text>
                )}
                <InlineStack>
                  <Button variant="plain" onClick={() => setAddressOpen(true)}>
                    {address ? 'Edit address' : 'Add address'}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      <AddressModal
        open={addressOpen}
        address={address}
        onClose={() => setAddressOpen(false)}
        onSave={(draft) => {
          setAddress(draft);
          setAddressOpen(false);
        }}
      />
    </Page>
  );
}
