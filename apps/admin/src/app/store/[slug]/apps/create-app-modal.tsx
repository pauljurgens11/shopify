'use client';

/** "Create app" — name plus the scope grid (G4). Owner: WS-G. */
import type { App } from '@merchant/contracts/apps';
import { Banner, BlockStack, FormLayout, Modal, Text, TextField } from '@shopify/polaris';
import { useState } from 'react';
import { type ApiError, apiFetch } from '../../../../lib/api.ts';
import { ScopeGrid } from './scope-grid.tsx';

type CreateAppResponse = { app: App; apiToken: string };

export function CreateAppModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** Hands the caller the one and only copy of the plaintext token. */
  onCreated: (app: App, apiToken: string) => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setScopes([]);
    setError(null);
    onClose();
  };

  const submit = () => {
    setSaving(true);
    setError(null);
    apiFetch<CreateAppResponse>('/admin/api/apps', {
      method: 'POST',
      body: { name: name.trim(), scopes },
    })
      .then((created) => {
        onCreated(created.app, created.apiToken);
        close();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setSaving(false));
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create an app"
      primaryAction={{
        content: 'Create app',
        onAction: submit,
        loading: saving,
        // The contract requires at least one scope; a token that can read
        // nothing is a support ticket, not a feature.
        disabled: name.trim() === '' || scopes.length === 0,
      }}
      secondaryActions={[{ content: 'Cancel', onAction: close, disabled: saving }]}
    >
      <Modal.Section>
        <FormLayout>
          {error ? (
            <Banner tone="critical" title="This app could not be created">
              <p>{error}</p>
            </Banner>
          ) : null}

          <TextField
            label="App name"
            name="name"
            autoComplete="off"
            value={name}
            onChange={setName}
            placeholder="Order sync"
            helpText="Only you see this — it labels the token in your app list."
          />

          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Admin API access scopes
            </Text>
            <Text as="p" tone="subdued">
              The token can only reach the areas you grant here.
            </Text>
            <ScopeGrid scopes={scopes} onChange={setScopes} disabled={saving} />
          </BlockStack>
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
