'use client';

/**
 * Customer detail (PARITY.md → Detail/form pages). Owner: WS-C (C6).
 *
 * Header: name + "Customer for N months". Left: last order, then order history
 * (C4's `/:id/orders`, which is C2's list shape, so this page and the orders
 * index cannot disagree). Right: Customer card, Default address, Tags, Notes.
 *
 * The right-hand cards edit in place and share one contextual save bar, which
 * is how Shopify's customer page behaves — there is no separate edit screen.
 */
import { format } from '@merchant/config/money';
import type { Paginated } from '@merchant/contracts/common';
import type { Customer } from '@merchant/contracts/customers';
import type { Order } from '@merchant/contracts/orders';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Layout,
  Link,
  Page,
  ResourceItem,
  ResourceList,
  SkeletonBodyText,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { PersonIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../../../../components/shell/page-header.tsx';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
// Read-only import from WS-C's own orders pages: the PARITY badge wording lives
// there once, and the customer page must not invent a second mapping.
import { financialBadge } from '../../orders/_components/status.ts';
import { type AddressDraft, AddressModal } from '../_components/address-modal.tsx';
import { type ContactDraft, ContactModal } from '../_components/contact-modal.tsx';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Shopify's "Customer for 8 months" subtitle. */
function customerFor(createdAt: string): string {
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)),
  );
  if (months < 1) return 'Customer for less than a month';
  if (months === 1) return 'Customer for 1 month';
  if (months < 12) return `Customer for ${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'Customer for 1 year' : `Customer for ${years} years`;
}

function fullName(customer: Customer): string {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return name === '' ? customer.email : name;
}

function AddressLines({ address }: { address: AddressDraft }) {
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
  return (
    <BlockStack gap="050">
      {name !== '' && <Text as="p">{name}</Text>}
      {address.company && <Text as="p">{address.company}</Text>}
      <Text as="p">{address.address1}</Text>
      {address.address2 && <Text as="p">{address.address2}</Text>}
      <Text as="p">{[address.city, address.province, address.zip].filter(Boolean).join(' ')}</Text>
      <Text as="p">{address.country}</Text>
      {address.phone && <Text as="p">{address.phone}</Text>}
    </BlockStack>
  );
}

export default function CustomerDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const customer = useApiQuery<Customer>(['customer', id], `/admin/api/customers/${id}`);
  const orders = useApiQuery<Paginated<Order>>(
    ['customer-orders', id],
    `/admin/api/customers/${id}/orders?limit=10`,
  );

  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [addresses, setAddresses] = useState<AddressDraft[]>([]);
  // The list is local page state, so an index identifies a row unambiguously;
  // null means the modal opens empty to add a new address.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactEmailError, setContactEmailError] = useState<string | undefined>();

  // Seed the editable state once the customer arrives, and again after a save.
  useEffect(() => {
    const loaded = customer.data;
    if (!loaded) return;
    setNote(loaded.note ?? '');
    setTags(loaded.tags);
    setAcceptsMarketing(loaded.acceptsMarketing);
    setAddresses(loaded.addresses.map(({ id: _id, ...rest }) => rest));
  }, [customer.data]);

  const loaded = customer.data;

  // Tracked separately from the rest: the PUT replaces address rows wholesale,
  // so a note-only save must not send `addresses` and recreate every row.
  const addressesDirty = useMemo(() => {
    if (!loaded) return false;
    return (
      JSON.stringify(addresses) !==
      JSON.stringify(loaded.addresses.map(({ id: _id, ...rest }) => rest))
    );
  }, [loaded, addresses]);

  const dirty = useMemo(() => {
    if (!loaded) return false;
    return (
      note !== (loaded.note ?? '') ||
      acceptsMarketing !== loaded.acceptsMarketing ||
      JSON.stringify(tags) !== JSON.stringify(loaded.tags) ||
      addressesDirty
    );
  }, [loaded, note, tags, acceptsMarketing, addressesDirty]);

  const discard = () => {
    if (!loaded) return;
    setNote(loaded.note ?? '');
    setTags(loaded.tags);
    setAcceptsMarketing(loaded.acceptsMarketing);
    setAddresses(loaded.addresses.map(({ id: _id, ...rest }) => rest));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/admin/api/customers/${id}`, {
        method: 'PUT',
        body: {
          note: note.trim() === '' ? null : note,
          tags,
          acceptsMarketing,
          ...(addressesDirty ? { addresses } : {}),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer', id] }),
        // The index shows the marketing badge, so it must not stay stale.
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ]);
      toast.show('Customer saved');
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async (draft: ContactDraft) => {
    setContactSaving(true);
    setContactEmailError(undefined);
    try {
      await apiFetch(`/admin/api/customers/${id}`, {
        method: 'PUT',
        body: {
          firstName: draft.firstName.trim() || null,
          lastName: draft.lastName.trim() || null,
          email: draft.email.trim(),
          phone: draft.phone.trim() || null,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer', id] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
      ]);
      toast.show('Customer saved');
      setContactOpen(false);
    } catch (cause) {
      const error = cause as ApiError;
      // A duplicate email belongs on the field, inside the still-open modal.
      if (error.field === 'email') setContactEmailError(error.message);
      else toast.error(error.message);
    } finally {
      setContactSaving(false);
    }
  };

  if (customer.isPending) return <PageSkeleton layout="detail" />;

  // A skeleton that never resolves reads as "the admin is broken". A deleted
  // customer gets a real not-found state; anything else gets the error.
  if (customer.isError || !loaded) {
    const missing = customer.error?.code === 'not_found';
    return (
      <Page>
        <BlockStack gap="400">
          <PageHeader
            icon={PersonIcon}
            title="Customer"
            parent={{ label: 'Customers', url: `/store/${slug}/customers` }}
          />
          {missing ? (
            <Card>
              {/* Hand-built rather than Polaris `EmptyState`, which requires an
                `image` — "" renders a phantom <img> request (page-skeleton.tsx). */}
              <Box padding="800">
                <BlockStack gap="200" inlineAlign="center">
                  <Text as="h2" variant="headingMd">
                    Customer not found
                  </Text>
                  <Text as="p" tone="subdued" alignment="center">
                    This customer may have been deleted.
                  </Text>
                  <Box paddingBlockStart="300">
                    <Button url={`/store/${slug}/customers`}>Back to customers</Button>
                  </Box>
                </BlockStack>
              </Box>
            </Card>
          ) : (
            <Banner
              tone="critical"
              title="This customer could not be loaded"
              action={{ content: 'Try again', onAction: () => customer.refetch() }}
            >
              <p>{customer.error?.message ?? 'Something went wrong. Please try again.'}</p>
            </Banner>
          )}
        </BlockStack>
      </Page>
    );
  }

  const orderRows = orders.data?.data ?? [];
  const lastOrder = orderRows[0];
  const lastOrderBadge = lastOrder ? financialBadge(lastOrder.financialStatus) : null;

  /** Exactly one default, restored here so the card never shows zero or two. */
  const normalizeDefault = (list: AddressDraft[]): AddressDraft[] =>
    list.length > 0 && !list.some((a) => a.isDefault)
      ? list.map((a, i) => ({ ...a, isDefault: i === 0 }))
      : list;

  const saveAddress = (draft: AddressDraft) => {
    setAddresses((current) => {
      const next =
        editingIndex === null
          ? [...current, draft]
          : current.map((a, i) => (i === editingIndex ? draft : a));
      const draftIndex = editingIndex ?? next.length - 1;
      return draft.isDefault
        ? next.map((a, i) => ({ ...a, isDefault: i === draftIndex }))
        : normalizeDefault(next);
    });
    setAddressOpen(false);
  };

  const removeAddress = (index: number) =>
    setAddresses((current) => normalizeDefault(current.filter((_, i) => i !== index)));

  const makeDefault = (index: number) =>
    setAddresses((current) => current.map((a, i) => ({ ...a, isDefault: i === index })));

  return (
    <Page>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} />

      <PageHeader
        icon={PersonIcon}
        parent={{ label: 'Customers', url: `/store/${slug}/customers` }}
        title={fullName(loaded)}
        subtitle={customerFor(loaded.createdAt)}
      />

      <Box paddingBlockStart="400">
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Last order placed
                  </Text>
                  {/* The orders query resolves after the customer's, so without
                    this the card flashes "hasn't placed an order yet" at a
                    customer who has (PARITY.md: skeleton, never a wrong state). */}
                  {orders.isPending ? (
                    <SkeletonBodyText lines={2} />
                  ) : lastOrder ? (
                    <BlockStack gap="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <Link url={`/store/${slug}/orders/${lastOrder.id}`} removeUnderline>
                          <Text as="span" fontWeight="semibold">
                            #{lastOrder.orderNumber}
                          </Text>
                        </Link>
                        <Text as="span">{format(lastOrder.total)}</Text>
                      </InlineStack>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" tone="subdued">
                          {shortDate(lastOrder.createdAt)}
                        </Text>
                        {lastOrderBadge && (
                          <Badge tone={lastOrderBadge.tone} progress={lastOrderBadge.progress}>
                            {lastOrderBadge.label}
                          </Badge>
                        )}
                      </InlineStack>
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">
                      This customer hasn’t placed an order yet.
                    </Text>
                  )}
                </BlockStack>
              </Card>

              <Card padding="0">
                <Box padding="400" paddingBlockEnd="200">
                  <Text as="h2" variant="headingMd">
                    Order history
                  </Text>
                </Box>
                {orders.isPending ? (
                  <Box padding="400">
                    <SkeletonBodyText lines={3} />
                  </Box>
                ) : orderRows.length === 0 ? (
                  <Box padding="400">
                    <Text as="p" tone="subdued">
                      Orders this customer places will appear here.
                    </Text>
                  </Box>
                ) : (
                  <ResourceList
                    resourceName={{ singular: 'order', plural: 'orders' }}
                    items={orderRows}
                    renderItem={(order) => (
                      <ResourceItem
                        key={order.id}
                        id={order.id}
                        onClick={() => router.push(`/store/${slug}/orders/${order.id}`)}
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="050">
                            <Text as="span" fontWeight="semibold">
                              #{order.orderNumber}
                            </Text>
                            <Text as="span" tone="subdued" variant="bodySm">
                              {shortDate(order.createdAt)}
                            </Text>
                          </BlockStack>
                          <InlineStack gap="300" blockAlign="center">
                            <Badge
                              tone={
                                order.fulfillmentStatus === 'fulfilled' ? undefined : 'attention'
                              }
                            >
                              {order.fulfillmentStatus === 'fulfilled'
                                ? 'Fulfilled'
                                : order.fulfillmentStatus === 'partially_fulfilled'
                                  ? 'Partially fulfilled'
                                  : 'Unfulfilled'}
                            </Badge>
                            <Text as="span">{format(order.total)}</Text>
                          </InlineStack>
                        </InlineStack>
                      </ResourceItem>
                    )}
                  />
                )}
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Customer
                    </Text>
                    <Button
                      variant="plain"
                      onClick={() => {
                        setContactEmailError(undefined);
                        setContactOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </InlineStack>
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued" variant="bodySm">
                      {loaded.ordersCount === 1 ? '1 order' : `${loaded.ordersCount} orders`} ·{' '}
                      {format(loaded.totalSpent)} spent
                    </Text>
                    <Link url={`mailto:${loaded.email}`} removeUnderline>
                      {loaded.email}
                    </Link>
                    {loaded.phone && <Text as="p">{loaded.phone}</Text>}
                  </BlockStack>
                  <Checkbox
                    label="Customer accepts email marketing"
                    checked={acceptsMarketing}
                    onChange={setAcceptsMarketing}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Addresses
                    </Text>
                    <Button
                      variant="plain"
                      onClick={() => {
                        setEditingIndex(null);
                        setAddressOpen(true);
                      }}
                    >
                      Add address
                    </Button>
                  </InlineStack>
                  {addresses.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No address on file.
                    </Text>
                  ) : (
                    addresses.map((address, index) => (
                      // The list is local state with no row ids; index is the key.
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id until saved
                      <BlockStack key={index} gap="200">
                        {index > 0 && <Divider />}
                        {address.isDefault && (
                          <InlineStack>
                            <Badge>Default address</Badge>
                          </InlineStack>
                        )}
                        <AddressLines address={address} />
                        <InlineStack gap="300">
                          <Button
                            variant="plain"
                            onClick={() => {
                              setEditingIndex(index);
                              setAddressOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          {!address.isDefault && (
                            <Button variant="plain" onClick={() => makeDefault(index)}>
                              Set as default
                            </Button>
                          )}
                          <Button
                            variant="plain"
                            tone="critical"
                            onClick={() => removeAddress(index)}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    ))
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Tags
                  </Text>
                  <TextField
                    label="Tags"
                    labelHidden
                    autoComplete="off"
                    placeholder="Add a tag"
                    value={tagDraft}
                    onChange={setTagDraft}
                    onBlur={() => {
                      const value = tagDraft.trim();
                      if (value !== '' && !tags.includes(value)) setTags([...tags, value]);
                      setTagDraft('');
                    }}
                  />
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
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Notes
                  </Text>
                  <TextField
                    label="Notes"
                    labelHidden
                    autoComplete="off"
                    multiline={3}
                    placeholder="Notes are private and won’t be shared with the customer."
                    value={note}
                    onChange={setNote}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Box>

      <AddressModal
        open={addressOpen}
        address={editingIndex === null ? null : (addresses[editingIndex] ?? null)}
        onClose={() => setAddressOpen(false)}
        onSave={saveAddress}
      />

      <ContactModal
        open={contactOpen}
        customer={loaded}
        saving={contactSaving}
        emailError={contactEmailError}
        onEmailEdit={() => setContactEmailError(undefined)}
        onClose={() => setContactOpen(false)}
        onSave={saveContact}
      />
    </Page>
  );
}
