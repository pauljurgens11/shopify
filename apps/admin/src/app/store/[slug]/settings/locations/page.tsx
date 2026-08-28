'use client';

/**
 * Settings → Locations (PARITY.md → Settings: narrow single column, section
 * cards, save bar). Owner: WS-B (B6).
 *
 * Where stock lives. Quantities themselves are never edited here — that is the
 * Inventory page, which goes through the adjustment service.
 */
import type { Location } from '@merchant/contracts/locations';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Modal,
  Page,
  Text,
  TextField,
  Tooltip,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';

type AddressDraft = {
  address1: string;
  address2: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  zip: string;
  phone: string;
};

type LocationDraft = {
  name: string;
  address: AddressDraft;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
};

const emptyAddress = (): AddressDraft => ({
  address1: '',
  address2: '',
  city: '',
  province: '',
  country: '',
  countryCode: '',
  zip: '',
  phone: '',
});

const emptyDraft = (): LocationDraft => ({
  name: '',
  address: emptyAddress(),
  isActive: true,
  fulfillsOnlineOrders: true,
});

function draftFrom(location: Location): LocationDraft {
  const address = (location.address ?? {}) as Partial<AddressDraft>;
  return {
    name: location.name,
    address: {
      ...emptyAddress(),
      ...Object.fromEntries(
        Object.entries(address).filter(([, value]) => typeof value === 'string'),
      ),
    },
    isActive: location.isActive,
    fulfillsOnlineOrders: location.fulfillsOnlineOrders,
  };
}

/** Drops the blank fields, so an untouched address stays null rather than a husk of "". */
function addressPayload(address: AddressDraft): Record<string, string> | null {
  const filled = Object.entries(address).filter(([, value]) => value.trim() !== '');
  if (filled.length === 0) return null;
  return Object.fromEntries(filled.map(([key, value]) => [key, value.trim()]));
}

function LocationDialog({
  open,
  location,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Absent when adding. */
  location?: Location;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [draft, setDraft] = useState<LocationDraft>(location ? draftFrom(location) : emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const nameError = draft.name.trim() === '' ? 'Name is required' : undefined;
  const patch = (changes: Partial<LocationDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const patchAddress = (changes: Partial<AddressDraft>) =>
    setDraft((current) => ({ ...current, address: { ...current.address, ...changes } }));

  const save = async () => {
    setSubmitted(true);
    setError(null);
    if (nameError) return;

    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        address: addressPayload(draft.address),
        isActive: draft.isActive,
        fulfillsOnlineOrders: draft.fulfillsOnlineOrders,
      };
      if (location) {
        await apiFetch(`/admin/api/locations/${location.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/admin/api/locations', { method: 'POST', body });
      }
      onSaved(location ? 'Location updated' : 'Location added');
    } catch (cause) {
      setError((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? 'Edit location' : 'Add location'}
      primaryAction={{ content: 'Save', loading: saving, onAction: save }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <FormLayout>
          {error ? (
            <Text as="p" tone="critical">
              {error}
            </Text>
          ) : null}

          <TextField
            label="Location name"
            name="name"
            autoComplete="off"
            value={draft.name}
            error={submitted ? nameError : undefined}
            onChange={(name) => patch({ name })}
          />

          <TextField
            label="Address"
            autoComplete="off"
            value={draft.address.address1}
            onChange={(address1) => patchAddress({ address1 })}
          />
          <TextField
            label="Apartment, suite, etc."
            autoComplete="off"
            value={draft.address.address2}
            onChange={(address2) => patchAddress({ address2 })}
          />
          <FormLayout.Group>
            <TextField
              label="City"
              autoComplete="off"
              value={draft.address.city}
              onChange={(city) => patchAddress({ city })}
            />
            <TextField
              label="State / province"
              autoComplete="off"
              value={draft.address.province}
              onChange={(province) => patchAddress({ province })}
            />
            <TextField
              label="ZIP / postal code"
              autoComplete="off"
              value={draft.address.zip}
              onChange={(zip) => patchAddress({ zip })}
            />
          </FormLayout.Group>
          <FormLayout.Group>
            <TextField
              label="Country"
              autoComplete="off"
              value={draft.address.country}
              onChange={(country) => patchAddress({ country })}
            />
            <TextField
              label="Phone"
              autoComplete="off"
              value={draft.address.phone}
              onChange={(phone) => patchAddress({ phone })}
            />
          </FormLayout.Group>

          <Checkbox
            label="This location is active"
            helpText="Inactive locations are hidden from fulfillment and inventory."
            checked={draft.isActive}
            onChange={(isActive) => patch({ isActive })}
          />
          <Checkbox
            label="Fulfill online orders from this location"
            checked={draft.fulfillsOnlineOrders}
            onChange={(fulfillsOnlineOrders) => patch({ fulfillsOnlineOrders })}
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

export default function LocationsSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Location | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const [busy, setBusy] = useState(false);

  const locations = useApiQuery<{ data: Location[] }>(['locations'], '/admin/api/locations');
  const rows = locations.data?.data ?? [];

  const refresh = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setAdding(false);
    setEditing(null);
    toast.show(message);
  };

  const destroy = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/api/locations/${deleting.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.show('Location deleted');
      setDeleting(null);
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (locations.isPending) return <PageSkeleton />;

  /** The two rules the API enforces, mirrored so the button explains itself. */
  const blockedReason = (location: Location): string | null => {
    if (location.stockedVariantCount > 0) {
      return `${location.name} still holds stock. Set its quantities to zero on the Inventory page first.`;
    }
    if (rows.length <= 1) return 'A store needs at least one location.';
    return null;
  };

  return (
    <Page
      backAction={{ content: 'Settings', url: `/store/${slug}/settings` }}
      title="Locations"
      primaryAction={{ content: 'Add location', onAction: () => setAdding(true) }}
    >
      <Card padding="0">
        <BlockStack gap="0">
          {rows.map((location, index) => {
            const blocked = blockedReason(location);
            const deleteButton = (
              <Button
                variant="tertiary"
                tone="critical"
                disabled={blocked !== null}
                onClick={() => setDeleting(location)}
              >
                Delete
              </Button>
            );

            return (
              <Box
                key={location.id}
                padding="400"
                borderBlockStartWidth={index === 0 ? '0' : '025'}
                borderColor="border"
              >
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingSm">
                        {location.name}
                      </Text>
                      {location.isActive ? null : <Badge>Inactive</Badge>}
                      {location.fulfillsOnlineOrders ? (
                        <Badge tone="success">Fulfills online orders</Badge>
                      ) : null}
                    </InlineStack>
                    <Text as="p" tone="subdued" variant="bodySm">
                      {location.stockedVariantCount === 0
                        ? 'No stock here'
                        : `${location.stockedVariantCount} ${
                            location.stockedVariantCount === 1 ? 'variant' : 'variants'
                          } stocked`}
                    </Text>
                  </BlockStack>

                  <InlineStack gap="200">
                    <Button onClick={() => setEditing(location)}>Edit</Button>
                    {/* Polaris tooltips do not fire on a disabled control, so
                        the reason is wrapped around it rather than on it. */}
                    {blocked ? <Tooltip content={blocked}>{deleteButton}</Tooltip> : deleteButton}
                  </InlineStack>
                </InlineStack>
              </Box>
            );
          })}
        </BlockStack>
      </Card>

      {adding ? <LocationDialog open onClose={() => setAdding(false)} onSaved={refresh} /> : null}
      {editing ? (
        <LocationDialog
          open
          key={editing.id}
          location={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'location'}?`}
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: busy,
          onAction: destroy,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setDeleting(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            This can’t be undone. Its inventory history is kept, but the location is removed from
            fulfillment.
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
