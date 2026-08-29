'use client';

/**
 * Add customer (docs/parity/customer-form.md). Owner: WS-C (C6).
 *
 * Two columns, product-form proportions. Left: Customer overview (names side by
 * side, email, phone with a country prefix, one marketing checkbox over a grey
 * caution strip) then Default address as a single bordered ⊕ row. Right rail:
 * Notes and Tags, both pencil-to-edit.
 *
 * The capture also shows Language, SMS/WhatsApp consent and Tax details. All
 * are out of scope (SPEC.md §2 cuts i18n and tax providers; §8 says a cut
 * feature is not rendered at all), so they are omitted rather than disabled.
 */
import {
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Form,
  FormLayout,
  Icon,
  InlineStack,
  Layout,
  Page,
  Select,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { ChevronRightIcon, PersonIcon, PlusCircleIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch } from '../../../../../lib/api.ts';
import { type AddressDraft, AddressModal } from '../_components/address-modal.tsx';
import { DIAL_CODES, PHONE_PREFIX_OPTIONS } from '../_components/countries.ts';
import { EditableCard } from '../_components/editable-card.tsx';

/** Verbatim from the capture — this strip is most of what makes the card read as Shopify. */
const MARKETING_CAUTION =
  'You should ask your customers for permission before you subscribe them to your marketing emails, SMS, or WhatsApp messages.';

/**
 * The page header is a breadcrumb, not a back-button + title: a person icon, a
 * chevron, then `New customer` (docs/parity/customer-form.md). Polaris `Page`'s
 * `backAction` renders the older arrow-button look.
 *
 * Deliberately duplicated from the product form rather than imported: that copy
 * lives inside WS-B's `product-form.tsx`, and CLAUDE.md §3 keeps workstreams out
 * of each other's app code. Hoisting it into `components/shell/` is WS-A's call
 * and the follow-up that docs/parity/product-form.md already tracks.
 */
function Breadcrumb({ customersUrl }: { customersUrl: string }) {
  return (
    <InlineStack gap="100" blockAlign="center">
      <Button
        variant="tertiary"
        icon={PersonIcon}
        url={customersUrl}
        accessibilityLabel="Customers"
      />
      {/* Boxed so the chevron sits inline with the title rather than filling. */}
      <Box width="20px">
        <Icon source={ChevronRightIcon} tone="subdued" />
      </Box>
      <Text as="h1" variant="headingLg" fontWeight="bold">
        New customer
      </Text>
    </InlineStack>
  );
}

/**
 * A full-width bordered row that behaves as a button: ⊕ / label / trailing `›`.
 * Polaris has no primitive for it — `Button` cannot put a chevron on the right —
 * so it is hand-built from Polaris tokens (CLAUDE.md §7 escape hatch).
 */
function BorderedRowButton({
  icon,
  children,
  onClick,
  accessibilityLabel,
}: {
  icon?: boolean;
  children: string;
  onClick: () => void;
  accessibilityLabel: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      borderWidth="025"
      borderColor="border"
      borderRadius="200"
      background={hovered ? 'bg-surface-hover' : 'bg-surface'}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={accessibilityLabel}
        style={{
          display: 'block',
          width: '100%',
          padding: 'var(--p-space-300)',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--p-border-radius-200)',
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            {icon && <Icon source={PlusCircleIcon} tone="base" />}
            <Text as="span">{children}</Text>
          </InlineStack>
          <Icon source={ChevronRightIcon} tone="subdued" />
        </InlineStack>
      </button>
    </Box>
  );
}

export default function NewCustomerPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('US');
  const [phone, setPhone] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [address, setAddress] = useState<AddressDraft | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();

  // The capture disables consent until there is something to consent with, and
  // a checkbox that ticks then silently stops applying is worse than a disabled
  // one — so the value is gated on `canMarket` at render and at save.
  const canMarket = email.trim() !== '' || phone.trim() !== '';

  /** Stored with its calling code, unless the merchant typed one already. */
  const fullPhone = (): string | null => {
    const digits = phone.trim();
    if (digits === '') return null;
    if (digits.startsWith('+')) return digits;
    return `${DIAL_CODES[phoneCountry] ?? ''} ${digits}`.trim();
  };

  const dirty =
    email !== '' ||
    firstName !== '' ||
    lastName !== '' ||
    phone !== '' ||
    acceptsMarketing ||
    address !== null ||
    note !== '' ||
    tagDraft !== '' ||
    tags.length > 0;

  /**
   * Tags including whatever is still sitting in the input. Clicking Save blurs
   * the field and fires `save` in the same tick, so the committed state has not
   * landed yet — without this the last tag typed is silently dropped.
   */
  const allTags = (): string[] => {
    const value = tagDraft.trim();
    return value === '' || tags.includes(value) ? tags : [...tags, value];
  };

  const commitTag = () => {
    setTags(allTags());
    setTagDraft('');
  };

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
          phone: fullPhone(),
          acceptsMarketing: canMarket && acceptsMarketing,
          note: note.trim() || null,
          tags: allTags(),
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

  const addressSummary = address
    ? [address.address1, address.city, address.zip, address.country].filter(Boolean).join(', ')
    : null;

  return (
    <Page>
      <SaveBar
        dirty={dirty}
        saving={saving}
        // Shopify names the thing being created on a /new page.
        message="Unsaved customer"
        onSave={save}
        onDiscard={() => router.push(`/store/${slug}/customers`)}
      />
      <BlockStack gap="400">
        <Breadcrumb customersUrl={`/store/${slug}/customers`} />
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* padding="0" so the caution strip can run edge to edge inside the card. */}
              <Card padding="0">
                <BlockStack gap="0">
                  <Box padding="400">
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
                          connectedLeft={
                            <Select
                              label="Country calling code"
                              labelHidden
                              options={PHONE_PREFIX_OPTIONS}
                              value={phoneCountry}
                              onChange={setPhoneCountry}
                            />
                          }
                        />
                        <Checkbox
                          label="Customer agreed to receive marketing emails."
                          checked={canMarket && acceptsMarketing}
                          disabled={!canMarket}
                          onChange={setAcceptsMarketing}
                        />
                      </FormLayout>
                    </BlockStack>
                  </Box>
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderBlockStartWidth="025"
                    borderColor="border"
                    borderEndStartRadius="300"
                    borderEndEndRadius="300"
                  >
                    <Text as="p" variant="bodySm" tone="subdued">
                      {MARKETING_CAUTION}
                    </Text>
                  </Box>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      Default address
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      The primary address of this customer
                    </Text>
                  </BlockStack>
                  <BorderedRowButton
                    icon={address === null}
                    onClick={() => setAddressOpen(true)}
                    accessibilityLabel={address ? 'Edit default address' : 'Add address'}
                  >
                    {addressSummary ?? 'Add address'}
                  </BorderedRowButton>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <EditableCard
                title="Notes"
                summary={
                  note.trim() === '' ? (
                    <Text as="p" tone="subdued">
                      Notes are private and won’t be shared with the customer.
                    </Text>
                  ) : (
                    <Text as="p">{note}</Text>
                  )
                }
              >
                <TextField
                  label="Notes"
                  labelHidden
                  autoComplete="off"
                  multiline={3}
                  placeholder="Notes are private and won’t be shared with the customer."
                  value={note}
                  onChange={setNote}
                />
              </EditableCard>

              <EditableCard
                title="Tags"
                startEditing
                summary={
                  tags.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No tags
                    </Text>
                  ) : (
                    <InlineStack gap="200">
                      {tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </InlineStack>
                  )
                }
              >
                <BlockStack gap="300">
                  {/* Polaris `Form` so Enter commits the tag: `TextField` exposes
                    no `onKeyDown`, and `Form` ships the hidden submit button
                    that makes implicit submission actually fire. */}
                  <Form onSubmit={commitTag}>
                    <TextField
                      label="Tags"
                      labelHidden
                      autoComplete="off"
                      value={tagDraft}
                      onChange={setTagDraft}
                      onBlur={commitTag}
                    />
                  </Form>
                  {tags.length > 0 && (
                    <InlineStack gap="200">
                      {tags.map((tag) => (
                        <Tag key={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))}>
                          {tag}
                        </Tag>
                      ))}
                    </InlineStack>
                  )}
                </BlockStack>
              </EditableCard>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <AddressModal
        open={addressOpen}
        address={address}
        showDefaultToggle={false}
        onClose={() => setAddressOpen(false)}
        onSave={(draft) => {
          setAddress(draft);
          setAddressOpen(false);
        }}
      />
    </Page>
  );
}
