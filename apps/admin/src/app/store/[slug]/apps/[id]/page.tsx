'use client';

/**
 * `/store/{slug}/apps/{id}` — one private app (SPEC §8, §13). Owner: WS-G (G4).
 *
 * Four stacked concerns, in the order a merchant works through them: the token
 * they just received, what it may reach, where events should go, and whether
 * those events arrived.
 *
 * The plaintext token is the delicate part. It exists only in the create/rotate
 * response — the database holds a hash — so it lives in React state here and
 * nowhere else, and dismissing or leaving the page destroys it for good.
 */
import type { App } from '@merchant/contracts/apps';
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  InlineCode,
  InlineStack,
  Modal,
  Page,
  Text,
} from '@shopify/polaris';
import { AppsIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../../../../components/shell/page-header.tsx';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { API_BASE_URL, type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { DeliveryLog } from '../delivery-log.tsx';
import { formatDateTime, mask } from '../format.ts';
import { RevealOnceCard } from '../reveal-once.tsx';
import { forgetSecret, peekSecret } from '../revealed-secrets.ts';
import { ScopeGrid } from '../scope-grid.tsx';
import { sameScopes, scopeCountLabel, sortScopes } from '../scopes.ts';
import { WebhooksCard } from '../webhooks-card.tsx';

type RotateResponse = { app: App; apiToken: string };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <InlineStack align="space-between" blockAlign="center" gap="400">
      <Text as="span" tone="subdued">
        {label}
      </Text>
      {children}
    </InlineStack>
  );
}

export default function AppDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const app = useApiQuery<App>(['app', id], `/admin/api/apps/${id}`);

  /**
   * Seeded from the index page's create response, which is the only other place
   * this value has ever existed. Read once into state, then dropped from the
   * handoff map immediately — a reload or a second visit shows the mask.
   */
  const [revealedToken, setRevealedToken] = useState<string | null>(() => peekSecret(id));
  useEffect(() => {
    forgetSecret(id);
  }, [id]);

  const [draftScopes, setDraftScopes] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [deliveryNonce, setDeliveryNonce] = useState(0);

  if (app.isPending) return <PageSkeleton primaryAction />;

  if (app.error || !app.data) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageHeader
            icon={AppsIcon}
            title="App"
            parent={{ label: 'Apps', url: `/store/${slug}/apps` }}
          />
          <Banner tone="critical" title="This app could not be loaded">
            <p>{app.error?.message ?? 'It may have been uninstalled.'}</p>
          </Banner>
        </BlockStack>
      </Page>
    );
  }

  const saved = sortScopes(app.data.scopes);
  const scopes = draftScopes ?? saved;
  const dirty = draftScopes !== null && !sameScopes(draftScopes, saved);

  const refreshApp = () => queryClient.invalidateQueries({ queryKey: ['app', id] });

  const saveScopes = () => {
    setSaving(true);
    apiFetch<App>(`/admin/api/apps/${id}`, { method: 'PUT', body: { scopes } })
      .then(() => {
        setDraftScopes(null);
        toast.show('Access scopes updated');
        void queryClient.invalidateQueries({ queryKey: ['apps'] });
        return refreshApp();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setSaving(false));
  };

  const rotate = () => {
    setRotating(true);
    apiFetch<RotateResponse>(`/admin/api/apps/${id}/rotate-token`, { method: 'POST' })
      .then((result) => {
        setRevealedToken(result.apiToken);
        setConfirmRotate(false);
        toast.show('API token rotated');
        void queryClient.invalidateQueries({ queryKey: ['apps'] });
        return refreshApp();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setRotating(false));
  };

  const uninstall = () => {
    setSaving(true);
    apiFetch(`/admin/api/apps/${id}`, { method: 'DELETE' })
      .then(() => {
        toast.show('App uninstalled');
        void queryClient.invalidateQueries({ queryKey: ['apps'] });
        router.push(`/store/${slug}/apps`);
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setSaving(false));
  };

  return (
    <Page>
      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={saveScopes}
        onDiscard={() => setDraftScopes(null)}
      />

      <Box paddingBlockEnd="400">
        <PageHeader
          icon={AppsIcon}
          parent={{ label: 'Apps', url: `/store/${slug}/apps` }}
          title={app.data.name}
          subtitle={`Created ${formatDateTime(app.data.createdAt)}`}
          actions={
            <Button tone="critical" variant="tertiary" onClick={() => setConfirmUninstall(true)}>
              Uninstall app
            </Button>
          }
        />
      </Box>

      <BlockStack gap="500">
        {revealedToken ? (
          <RevealOnceCard
            title="Copy your API access token now"
            description="This is the only time we can show it — we store a hash, not the token. Send it as an Authorization: Bearer header. If you lose it, rotate the token to get a new one."
            value={revealedToken}
            onDismiss={() => setRevealedToken(null)}
          />
        ) : null}

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Admin API credentials
              </Text>
              <Button loading={rotating} onClick={() => setConfirmRotate(true)}>
                Rotate API token
              </Button>
            </InlineStack>

            <BlockStack gap="300">
              <DetailRow label="Access token">
                <Text as="span" fontWeight="medium">
                  {mask(app.data.tokenSuffix)}
                </Text>
              </DetailRow>
              <DetailRow label="Last used">
                <Text as="span">
                  {app.data.lastUsedAt ? formatDateTime(app.data.lastUsedAt) : 'Never'}
                </Text>
              </DetailRow>
              <DetailRow label="API endpoint">
                <InlineCode>{`${API_BASE_URL}/api`}</InlineCode>
              </DetailRow>
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <BlockStack gap="050">
              <Text as="h2" variant="headingMd">
                Admin API access scopes
              </Text>
              <Text as="p" tone="subdued">
                {scopeCountLabel(saved)} granted. Requests outside them are refused.
              </Text>
            </BlockStack>
            <ScopeGrid scopes={scopes} onChange={setDraftScopes} disabled={saving} />
          </BlockStack>
        </Card>

        {/* Sending a test event bumps the nonce so the log below re-reads it. */}
        <WebhooksCard appId={id} onDelivery={() => setDeliveryNonce((n) => n + 1)} />

        <DeliveryLog appId={id} refreshKey={deliveryNonce} />
      </BlockStack>

      <Modal
        open={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        title="Rotate this app’s API token?"
        primaryAction={{
          content: 'Rotate token',
          destructive: true,
          loading: rotating,
          onAction: rotate,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmRotate(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            The current token stops working immediately. Anything using it will get a 401 until you
            paste in the new one, which we’ll show you once.
          </Text>
        </Modal.Section>
      </Modal>

      <Modal
        open={confirmUninstall}
        onClose={() => setConfirmUninstall(false)}
        title={`Uninstall ${app.data.name}?`}
        primaryAction={{
          content: 'Uninstall app',
          destructive: true,
          loading: saving,
          onAction: uninstall,
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmUninstall(false) }]}
      >
        <Modal.Section>
          <Box paddingBlockEnd="200">
            <Text as="p">
              This revokes the token and stops all webhook deliveries for this app. It can’t be
              undone.
            </Text>
          </Box>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
