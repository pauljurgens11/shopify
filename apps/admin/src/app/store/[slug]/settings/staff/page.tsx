'use client';

/**
 * Settings → Users and permissions (SPEC §8). Owner: WS-A.
 *
 * `staff` is the only role the permission checkboxes apply to; owner and admin
 * bypass the map entirely, which is what `lib/permissions.ts` enforces server
 * side. Editing a user ends their sessions, so revoked access takes effect on
 * the tab they already have open.
 */
import { PERMISSION_AREAS, type PermissionArea } from '@merchant/config/constants';
import type { Permissions, StaffUser } from '@merchant/contracts/auth';
import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineGrid,
  InlineStack,
  Modal,
  ResourceItem,
  ResourceList,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';

const KEY = ['settings', 'staff'];
const PATH = '/admin/api/settings/staff';

const ROLES = [
  { label: 'Staff', value: 'staff' },
  { label: 'Administrator', value: 'admin' },
];

type Draft = {
  email: string;
  password: string;
  firstName: string;
  role: string;
  permissions: Permissions;
};

const EMPTY: Draft = { email: '', password: '', firstName: '', role: 'staff', permissions: {} };

const nameOf = (user: StaffUser) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

export default function StaffSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isPending } = useApiQuery<{ data: StaffUser[] }>(KEY, PATH);
  const staff = data?.data ?? [];

  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StaffUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const open = (user: StaffUser | null) => {
    setEditing(user);
    setDraft(
      user
        ? {
            email: user.email,
            password: '',
            firstName: user.firstName ?? '',
            role: user.role,
            permissions: user.permissions,
          }
        : EMPTY,
    );
    setError(null);
  };
  const close = () => {
    setEditing(null);
    setDraft(null);
    setError(null);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const submit = () => {
    if (!draft) return;
    setSaving(true);
    setError(null);

    const body = editing
      ? { role: draft.role, permissions: draft.permissions, firstName: draft.firstName || null }
      : {
          email: draft.email.trim(),
          password: draft.password,
          role: draft.role,
          permissions: draft.permissions,
          ...(draft.firstName ? { firstName: draft.firstName } : {}),
        };

    apiFetch(editing ? `${PATH}/${editing.id}` : PATH, {
      method: editing ? 'PUT' : 'POST',
      body,
    })
      .then(() => {
        toast.show(editing ? 'Staff member updated' : 'Staff member added');
        close();
        return refresh();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setSaving(false));
  };

  const remove = (user: StaffUser) => {
    setRemoving(true);
    apiFetch(`${PATH}/${user.id}`, { method: 'DELETE' })
      .then(() => {
        toast.show('Staff member removed');
        setDeleting(null);
        return refresh();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setRemoving(false));
  };

  const togglePermission = (area: PermissionArea, checked: boolean) =>
    setDraft((d) => ({
      ...(d ?? EMPTY),
      permissions: { ...(d ?? EMPTY).permissions, [area]: checked },
    }));

  return (
    <SettingsPage title="Users and permissions" loading={isPending}>
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Store users
            </Text>
            <Button onClick={() => open(null)}>Add user</Button>
          </InlineStack>

          <ResourceList
            resourceName={{ singular: 'user', plural: 'users' }}
            items={staff}
            renderItem={(user) => (
              // Polaris returns renderItem's element as-is, so the key is ours to set.
              <ResourceItem
                key={user.id}
                id={user.id}
                onClick={() => (user.role === 'owner' ? undefined : open(user))}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="050">
                    <Text as="span" fontWeight="semibold">
                      {nameOf(user)}
                    </Text>
                    <Text as="span" tone="subdued">
                      {user.email}
                    </Text>
                  </BlockStack>
                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone={user.role === 'owner' ? 'success' : undefined}>
                      {user.role === 'owner'
                        ? 'Store owner'
                        : user.role === 'admin'
                          ? 'Administrator'
                          : 'Staff'}
                    </Badge>
                    {/* The owner is the one account that cannot be removed —
                        the server refuses it too, this just hides the trap. */}
                    {user.role === 'owner' ? null : (
                      /* ResourceItem's row click fires for anything inside it, so
                         without this Remove also opens the edit modal behind the
                         confirmation. Same containment as the inventory table. */
                      // biome-ignore lint/a11y/noStaticElementInteractions: containment only
                      // biome-ignore lint/a11y/useKeyWithClickEvents: containment only
                      <div onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="plain"
                          tone="critical"
                          onClick={() => setDeleting(user)}
                          accessibilityLabel={`Remove ${nameOf(user)}`}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </InlineStack>
                </InlineStack>
              </ResourceItem>
            )}
          />
        </BlockStack>
      </Card>

      {/* Removing a user deletes their account and ends their sessions, so it
          asks first — the same confirmation every other destructive action in
          Settings uses. */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? `Remove ${nameOf(deleting)}?` : 'Remove user?'}
        primaryAction={{
          content: 'Remove user',
          destructive: true,
          loading: removing,
          onAction: () => (deleting ? remove(deleting) : undefined),
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setDeleting(null), disabled: removing },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            They lose access to this store immediately, including any session they already have
            open. This can’t be undone.
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={draft !== null}
        onClose={close}
        title={editing ? `Edit ${nameOf(editing)}` : 'Add user'}
        primaryAction={{ content: 'Save', onAction: submit, loading: saving }}
        secondaryActions={[{ content: 'Cancel', onAction: close }]}
      >
        <Modal.Section>
          <FormLayout>
            {error ? (
              <Text as="p" tone="critical">
                {error}
              </Text>
            ) : null}

            <TextField
              label="Name"
              name="firstName"
              autoComplete="given-name"
              value={draft?.firstName ?? ''}
              onChange={(firstName) => setDraft((d) => ({ ...(d ?? EMPTY), firstName }))}
            />

            {editing ? null : (
              <>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={draft?.email ?? ''}
                  onChange={(email) => setDraft((d) => ({ ...(d ?? EMPTY), email }))}
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  helpText="There is no invite email yet — share this with them directly."
                  value={draft?.password ?? ''}
                  onChange={(password) => setDraft((d) => ({ ...(d ?? EMPTY), password }))}
                />
              </>
            )}

            <Select
              label="Role"
              options={ROLES}
              value={draft?.role ?? 'staff'}
              onChange={(role) => setDraft((d) => ({ ...(d ?? EMPTY), role }))}
              helpText="Administrators have access to everything."
            />

            {draft?.role === 'staff' ? (
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Permissions
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="100">
                  {PERMISSION_AREAS.map((area) => (
                    <Checkbox
                      key={area}
                      label={area.charAt(0).toUpperCase() + area.slice(1)}
                      checked={draft.permissions[area] === true}
                      onChange={(checked) => togglePermission(area, checked)}
                    />
                  ))}
                </InlineGrid>
              </BlockStack>
            ) : null}
          </FormLayout>
        </Modal.Section>
      </Modal>
    </SettingsPage>
  );
}
