'use client';

/**
 * Webhook subscriptions for one app (SPEC §13, G4). Owner: WS-G.
 *
 * A subscription is a topic plus a URL plus a signing secret. The secret is
 * generated server-side and returned exactly once, same rule as the API token,
 * so creating one drops straight into a reveal-once banner instead of a toast.
 *
 * "Send test event" fires a real event through the queue rather than faking a
 * row: the whole point of the button is to prove the merchant's endpoint
 * verifies our HMAC, and a simulated success proves nothing.
 */
import { WEBHOOK_TOPICS, type WebhookTopic } from '@merchant/config/constants';
import type { AppWebhook } from '@merchant/contracts/apps';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  FormLayout,
  InlineStack,
  Modal,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';
import { mask, topicLabel } from './format.ts';
import { RevealOnceCard } from './reveal-once.tsx';

type CreateWebhookResponse = { subscription: AppWebhook; secret: string };
type TestEventResponse = { eventId: string | null; queued: boolean };

const TOPIC_OPTIONS = WEBHOOK_TOPICS.map((topic) => ({
  label: `${topicLabel(topic)} — ${topic}`,
  value: topic,
}));

export function WebhooksCard({ appId, onDelivery }: { appId: string; onDelivery: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const key = ['app', appId, 'webhooks'];
  const path = `/admin/api/apps/${appId}/webhooks`;
  const webhooks = useApiQuery<{ data: AppWebhook[] }>(key, path);
  const rows = webhooks.data?.data ?? [];

  const [adding, setAdding] = useState(false);
  const [topic, setTopic] = useState<WebhookTopic>(WEBHOOK_TOPICS[0]);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<AppWebhook | null>(null);

  /** Plaintext, state-only: reloading the page must not bring it back. */
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const closeModal = () => {
    setAdding(false);
    setUrl('');
    setError(null);
  };

  const create = () => {
    setSaving(true);
    setError(null);
    apiFetch<CreateWebhookResponse>(path, { method: 'POST', body: { topic, url: url.trim() } })
      .then((created) => {
        setRevealedSecret(created.secret);
        closeModal();
        toast.show('Webhook subscription created');
        return refresh();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setSaving(false));
  };

  const remove = (subscription: AppWebhook) => {
    setBusyId(subscription.id);
    apiFetch(`${path}/${subscription.id}`, { method: 'DELETE' })
      .then(() => {
        toast.show('Webhook subscription deleted');
        setConfirmingDelete(null);
        return refresh();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setBusyId(null));
  };

  // A test event is queued, not delivered inline, so the log needs a second
  // look a moment later — otherwise the merchant clicks "Send test event" and
  // stares at an unchanged table.
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const sendTest = (subscription: AppWebhook) => {
    setBusyId(subscription.id);
    apiFetch<TestEventResponse>(`${path}/${subscription.id}/test`, { method: 'POST' })
      .then((result) => {
        if (!result.queued) {
          toast.error('Test event could not be queued. Check that the worker is running.');
          return;
        }
        toast.show('Test event sent');
        onDelivery();
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(onDelivery, 2_000);
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setBusyId(null));
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="050">
            <Text as="h2" variant="headingMd">
              Webhook subscriptions
            </Text>
            <Text as="p" tone="subdued">
              We POST the event to your URL and sign the body with the subscription’s secret.
            </Text>
          </BlockStack>
          <Button onClick={() => setAdding(true)}>Add webhook</Button>
        </InlineStack>

        {revealedSecret ? (
          <RevealOnceCard
            title="Signing secret"
            description="Verify the x-merchant-hmac-sha256 header with this secret. It is stored hashed, so this is the only time we can show it to you."
            value={revealedSecret}
            onDismiss={() => setRevealedSecret(null)}
          />
        ) : null}

        {webhooks.isPending ? (
          <SkeletonBodyText lines={3} />
        ) : rows.length === 0 ? (
          <Box padding="500">
            <BlockStack gap="150" inlineAlign="center">
              <Text as="p" fontWeight="semibold">
                No webhooks yet
              </Text>
              <Text as="p" tone="subdued" alignment="center">
                Subscribe an endpoint to an event and we’ll notify it whenever that event happens.
              </Text>
            </BlockStack>
          </Box>
        ) : (
          // Hand-built rows rather than `ResourceList`: `ResourceItem` requires a
          // row-level `url` or `onClick`, and there is nowhere for a subscription
          // row to navigate to — a row that highlights on hover and then does
          // nothing reads as broken. Polaris primitives and tokens throughout.
          <BlockStack gap="0">
            {rows.map((subscription, index) => (
              <Box
                key={subscription.id}
                paddingBlock="300"
                {...(index === 0
                  ? {}
                  : { borderBlockStartWidth: '025' as const, borderColor: 'border' as const })}
              >
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <BlockStack gap="050">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" fontWeight="semibold">
                        {topicLabel(subscription.topic)}
                      </Text>
                      <Text as="span" tone="subdued">
                        {subscription.topic}
                      </Text>
                      {subscription.isActive ? null : <Badge>Paused</Badge>}
                    </InlineStack>
                    <Text as="span" tone="subdued" breakWord>
                      {subscription.url}
                    </Text>
                    <Text as="span" tone="subdued">
                      Secret {mask(subscription.secretSuffix)}
                    </Text>
                  </BlockStack>

                  <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <Button
                      variant="plain"
                      loading={busyId === subscription.id}
                      onClick={() => sendTest(subscription)}
                    >
                      Send test event
                    </Button>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => setConfirmingDelete(subscription)}
                      accessibilityLabel={`Delete the ${subscription.topic} webhook`}
                    >
                      Delete
                    </Button>
                  </InlineStack>
                </InlineStack>
              </Box>
            ))}
          </BlockStack>
        )}
      </BlockStack>

      <Modal
        open={adding}
        onClose={closeModal}
        title="Add webhook subscription"
        primaryAction={{
          content: 'Save',
          onAction: create,
          loading: saving,
          disabled: url.trim() === '',
        }}
        secondaryActions={[{ content: 'Cancel', onAction: closeModal, disabled: saving }]}
      >
        <Modal.Section>
          <FormLayout>
            {error ? (
              <Banner tone="critical" title="This subscription could not be created">
                <p>{error}</p>
              </Banner>
            ) : null}
            <Select
              label="Event"
              options={TOPIC_OPTIONS}
              value={topic}
              onChange={(value) => setTopic(value as WebhookTopic)}
            />
            <TextField
              label="URL"
              name="url"
              type="url"
              autoComplete="off"
              value={url}
              onChange={setUrl}
              placeholder="https://example.com/webhooks/merchant"
              helpText="Must respond 2xx within 5 seconds. We retry 5 times with backoff."
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      <Modal
        open={confirmingDelete !== null}
        onClose={() => setConfirmingDelete(null)}
        title="Delete this webhook subscription?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          loading: busyId !== null,
          onAction: () => (confirmingDelete ? remove(confirmingDelete) : undefined),
        }}
        secondaryActions={[{ content: 'Cancel', onAction: () => setConfirmingDelete(null) }]}
      >
        <Modal.Section>
          <Text as="p">
            {confirmingDelete?.url} stops receiving {confirmingDelete?.topic} events immediately.
            Past deliveries stay in the log.
          </Text>
        </Modal.Section>
      </Modal>
    </Card>
  );
}
