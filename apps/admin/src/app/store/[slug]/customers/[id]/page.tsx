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
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  Link,
  Page,
  ResourceItem,
  ResourceList,
  Tag,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { type AddressDraft, AddressModal } from '../_components/address-modal.tsx';

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
  const [editingAddress, setEditingAddress] = useState<AddressDraft | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const dirty = useMemo(() => {
    if (!loaded) return false;
    return (
      note !== (loaded.note ?? '') ||
      acceptsMarketing !== loaded.acceptsMarketing ||
      JSON.stringify(tags) !== JSON.stringify(loaded.tags) ||
      JSON.stringify(addresses) !==
        JSON.stringify(loaded.addresses.map(({ id: _id, ...rest }) => rest))
    );
  }, [loaded, note, tags, acceptsMarketing, addresses]);

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
        body: { note: note.trim() === '' ? null : note, tags, acceptsMarketing, addresses },
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.show('Customer saved');
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  if (customer.isPending) return <PageSkeleton />;
  if (!loaded) return <PageSkeleton />;

  const orderRows = orders.data?.data ?? [];
  const lastOrder = orderRows[0];
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const saveAddress = (draft: AddressDraft) => {
    setAddresses((current) => {
      const next = editingAddress
        ? current.map((a) => (a === editingAddress ? draft : a))
        : [...current, draft];
      // One default, decided here so the card cannot show two before saving.
      return draft.isDefault ? next.map((a) => ({ ...a, isDefault: a === draft })) : next;
    });
    setAddressOpen(false);
  };

  return (
    <Page
      backAction={{ content: 'Customers', url: `/store/${slug}/customers` }}
      title={fullName(loaded)}
      subtitle={customerFor(loaded.createdAt)}
    >
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} />

      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Last order placed
                </Text>
                {lastOrder ? (
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
                      <Badge tone={lastOrder.financialStatus === 'paid' ? undefined : 'attention'}>
                        {lastOrder.financialStatus === 'paid' ? 'Paid' : 'Payment pending'}
                      </Badge>
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
              {orderRows.length === 0 ? (
                <Box padding="400">
                  <Text as="p" tone="subdued">
                    No orders yet.
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
                            tone={order.fulfillmentStatus === 'fulfilled' ? undefined : 'attention'}
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
                <Text as="h2" variant="headingMd">
                  Customer
                </Text>
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
                    Default address
                  </Text>
                  <Button
                    variant="plain"
                    onClick={() => {
                      setEditingAddress(defaultAddress ?? null);
                      setAddressOpen(true);
                    }}
                  >
                    {defaultAddress ? 'Manage' : 'Add'}
                  </Button>
                </InlineStack>
                {defaultAddress ? (
                  <AddressLines address={defaultAddress} />
                ) : (
                  <Text as="p" tone="subdued">
                    No address on file.
                  </Text>
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

      <AddressModal
        open={addressOpen}
        address={editingAddress}
        onClose={() => setAddressOpen(false)}
        onSave={saveAddress}
      />
    </Page>
  );
}
