'use client';

/**
 * Settings → Payments (SPEC §11, D4). Owner: WS-D.
 *
 * Two cards: the providers a merchant can connect (mock / Stripe / Maverick)
 * and the routing table that splits traffic between them. Connecting is an
 * immediate action with its own modal and toast; the routing table edits as a
 * draft behind the contextual save bar, because the server validates the list
 * as a unit (a partial update can leave weights that mean nothing).
 *
 * No payout schedules, no fraud settings, no Shopify branding — this page is
 * "Merchant Pay".
 */
import type { ProcessorConfig, ProcessorKey, RoutingRule } from '@merchant/contracts/pay';
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  ChoiceList,
  Divider,
  FormLayout,
  InlineError,
  InlineStack,
  Modal,
  Popover,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
import { useToast } from '../../../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';
import {
  moveRule,
  newRuleDraft,
  type RuleDraft,
  toDrafts,
  toRulesInput,
  validateDrafts,
} from './routing-draft.ts';

const PROCESSORS_KEY = ['payments', 'processors'];
const RULES_KEY = ['payments', 'routing-rules'];

/** The three adapters SPEC §11 ships. `mock` connects with one click. */
const PROVIDERS: Array<{ key: ProcessorKey; name: string; description: string }> = [
  { key: 'mock', name: 'Mock Gateway', description: 'Deterministic test cards for the demo.' },
  { key: 'stripe', name: 'Stripe', description: 'Charge real or test cards with your own keys.' },
  { key: 'maverick', name: 'Maverick', description: 'Simulated without credentials.' },
];

const BRAND_CHOICES = [
  { label: 'Visa', value: 'visa' },
  { label: 'Mastercard', value: 'mastercard' },
  { label: 'American Express', value: 'amex' },
  { label: 'Discover', value: 'discover' },
  { label: 'JCB', value: 'jcb' },
  { label: 'Diners Club', value: 'diners' },
];

function brandsLabel(brands: string[]): string {
  if (brands.length === 0) return 'Any card brand';
  return brands
    .map((brand) => BRAND_CHOICES.find((choice) => choice.value === brand)?.label ?? brand)
    .join(', ');
}

/* --- connect modal --------------------------------------------------------- */

function ConnectModal({
  provider,
  onClose,
  onConnected,
}: {
  provider: (typeof PROVIDERS)[number];
  onClose: () => void;
  onConnected: () => void;
}) {
  const toast = useToast();
  const [secretKey, setSecretKey] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    setSaving(true);
    setError(null);
    const credentials =
      provider.key === 'stripe'
        ? { secretKey: secretKey.trim() }
        : provider.key === 'maverick'
          ? {
              ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
              ...(merchantId.trim() ? { merchantId: merchantId.trim() } : {}),
            }
          : {};

    apiFetch('/admin/api/payments/processors', {
      method: 'POST',
      body: { processor: provider.key, displayName: provider.name, credentials, testMode },
    })
      .then(() => {
        toast.show(`${provider.name} connected`);
        onConnected();
        onClose();
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setSaving(false));
  };

  const maverickSimulated = provider.key === 'maverick' && !(apiKey.trim() && merchantId.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title={`Connect ${provider.name}`}
      primaryAction={{
        content: 'Connect',
        onAction: connect,
        loading: saving,
        disabled: provider.key === 'stripe' && !secretKey.trim(),
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose, disabled: saving }]}
    >
      <Modal.Section>
        <FormLayout>
          {error ? (
            <Banner tone="critical">
              <Text as="p">{error}</Text>
            </Banner>
          ) : null}

          {provider.key === 'stripe' ? (
            <TextField
              label="Secret key"
              type="password"
              autoComplete="off"
              value={secretKey}
              onChange={setSecretKey}
              helpText="Starts with sk_. Verified with Stripe before it’s saved, then stored encrypted — it’s never shown again."
            />
          ) : null}

          {provider.key === 'maverick' ? (
            <>
              <TextField
                label="API key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={setApiKey}
                helpText="Optional. Stored encrypted and never shown again."
              />
              <TextField
                label="Merchant ID"
                autoComplete="off"
                value={merchantId}
                onChange={setMerchantId}
                helpText="Optional."
              />
              {maverickSimulated ? (
                <Banner tone="info">
                  <Text as="p">
                    Without credentials, Maverick runs in simulated mode — approvals and refunds are
                    emulated, and no real money moves.
                  </Text>
                </Banner>
              ) : null}
            </>
          ) : null}

          <Checkbox label="Test mode" checked={testMode} onChange={setTestMode} />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

/* --- providers card -------------------------------------------------------- */

function ProvidersCard({ configs, refresh }: { configs: ProcessorConfig[]; refresh: () => void }) {
  const toast = useToast();
  const [connecting, setConnecting] = useState<(typeof PROVIDERS)[number] | null>(null);
  const [disconnecting, setDisconnecting] = useState<ProcessorConfig | null>(null);
  const [busy, setBusy] = useState(false);

  const byProcessor = new Map(configs.map((config) => [config.processor, config]));

  const connectMock = () => {
    setBusy(true);
    apiFetch('/admin/api/payments/processors', {
      method: 'POST',
      body: { processor: 'mock', displayName: 'Mock Gateway', credentials: {} },
    })
      .then(() => {
        toast.show('Mock Gateway connected');
        refresh();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setBusy(false));
  };

  const disconnect = () => {
    if (!disconnecting) return;
    setBusy(true);
    apiFetch(`/admin/api/payments/processors/${disconnecting.id}`, { method: 'DELETE' })
      .then(() => {
        toast.show(`${disconnecting.displayName} disconnected`);
        setDisconnecting(null);
        refresh();
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Payment providers
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Providers that can charge your customers’ cards. Credentials are stored encrypted and
            never shown again.
          </Text>
        </BlockStack>

        <BlockStack gap="0">
          {PROVIDERS.map((provider, index) => {
            const config = byProcessor.get(provider.key);
            return (
              <Box key={provider.key} paddingBlock="300">
                {index > 0 ? (
                  <Box paddingBlockEnd="300">
                    <Divider />
                  </Box>
                ) : null}
                <InlineStack align="space-between" blockAlign="center" gap="400">
                  <BlockStack gap="050">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" fontWeight="semibold">
                        {config?.displayName ?? provider.name}
                      </Text>
                      {config ? (
                        config.connected ? (
                          <Badge tone="success">Connected</Badge>
                        ) : (
                          <Badge tone="critical">Error</Badge>
                        )
                      ) : null}
                      {config?.testMode ? <Badge>Test mode</Badge> : null}
                    </InlineStack>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {provider.description}
                    </Text>
                  </BlockStack>

                  {config ? (
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => setDisconnecting(config)}
                      accessibilityLabel={`Disconnect ${config.displayName}`}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={
                        provider.key === 'mock' ? connectMock : () => setConnecting(provider)
                      }
                      loading={provider.key === 'mock' && busy}
                    >
                      Connect
                    </Button>
                  )}
                </InlineStack>
              </Box>
            );
          })}
        </BlockStack>
      </BlockStack>

      {connecting ? (
        <ConnectModal
          provider={connecting}
          onClose={() => setConnecting(null)}
          onConnected={refresh}
        />
      ) : null}

      <Modal
        open={disconnecting !== null}
        onClose={() => setDisconnecting(null)}
        title={`Disconnect ${disconnecting?.displayName}?`}
        primaryAction={{
          content: 'Disconnect',
          destructive: true,
          loading: busy,
          onAction: disconnect,
        }}
        secondaryActions={[
          { content: 'Cancel', onAction: () => setDisconnecting(null), disabled: busy },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            New charges stop routing to it and its routing rules are removed. Past payments keep
            their history, but refunds through it will fail until it’s reconnected.
          </Text>
        </Modal.Section>
      </Modal>
    </Card>
  );
}

/* --- routing rules card ---------------------------------------------------- */

function RuleRow({
  draft,
  index,
  count,
  processors,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  draft: RuleDraft;
  index: number;
  count: number;
  processors: ProcessorConfig[];
  error?: string;
  onChange: (patch: Partial<RuleDraft>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [brandsOpen, setBrandsOpen] = useState(false);

  return (
    <BlockStack gap="200">
      <InlineStack gap="200" blockAlign="start" wrap={false}>
        <Box width="40%">
          <Select
            label="Provider"
            labelHidden={index > 0}
            options={processors.map((config) => ({
              label: config.displayName,
              value: config.id,
            }))}
            placeholder="Choose a provider"
            value={draft.processorConfigId || undefined}
            onChange={(processorConfigId) => onChange({ processorConfigId })}
          />
        </Box>
        <Box width="20%">
          <TextField
            label="Weight"
            labelHidden={index > 0}
            type="number"
            suffix="%"
            min={0}
            max={100}
            autoComplete="off"
            value={draft.weight}
            onChange={(weight) => onChange({ weight })}
          />
        </Box>
        <Box width="40%">
          <BlockStack gap="100">
            {index === 0 ? (
              <Text as="span" variant="bodyMd">
                Conditions
              </Text>
            ) : null}
            <InlineStack gap="200" blockAlign="center">
              <Popover
                active={brandsOpen}
                onClose={() => setBrandsOpen(false)}
                activator={
                  <Button disclosure onClick={() => setBrandsOpen((open) => !open)}>
                    {brandsLabel(draft.cardBrands)}
                  </Button>
                }
              >
                <Box padding="300">
                  <ChoiceList
                    title="Card brands"
                    titleHidden
                    allowMultiple
                    choices={BRAND_CHOICES}
                    selected={draft.cardBrands}
                    onChange={(cardBrands) =>
                      onChange({ cardBrands: cardBrands as RuleDraft['cardBrands'] })
                    }
                  />
                </Box>
              </Popover>
              <Button
                icon={ChevronUpIcon}
                variant="tertiary"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                accessibilityLabel="Move rule up"
              />
              <Button
                icon={ChevronDownIcon}
                variant="tertiary"
                disabled={index === count - 1}
                onClick={() => onMove(1)}
                accessibilityLabel="Move rule down"
              />
              <Button
                icon={DeleteIcon}
                variant="tertiary"
                tone="critical"
                onClick={onRemove}
                accessibilityLabel="Remove rule"
              />
            </InlineStack>
          </BlockStack>
        </Box>
      </InlineStack>

      <InlineStack gap="200">
        <Box width="30%">
          <TextField
            label="Minimum order amount"
            labelHidden
            placeholder="Min amount"
            type="number"
            prefix="$"
            min={0}
            step={0.01}
            autoComplete="off"
            value={draft.minAmount}
            onChange={(minAmount) => onChange({ minAmount })}
          />
        </Box>
        <Box width="30%">
          <TextField
            label="Maximum order amount"
            labelHidden
            placeholder="Max amount"
            type="number"
            prefix="$"
            min={0}
            step={0.01}
            autoComplete="off"
            value={draft.maxAmount}
            onChange={(maxAmount) => onChange({ maxAmount })}
          />
        </Box>
      </InlineStack>

      {error ? <InlineError message={error} fieldID={draft.key} /> : null}
    </BlockStack>
  );
}

/* --- page ------------------------------------------------------------------ */

export default function PaymentsSettingsPage() {
  const { data: session } = useSession();
  const currency = session?.shop.currencyCode ?? 'USD';
  const queryClient = useQueryClient();
  const toast = useToast();

  const processorsQuery = useApiQuery<{ data: ProcessorConfig[] }>(
    PROCESSORS_KEY,
    '/admin/api/payments/processors',
  );
  const rulesQuery = useApiQuery<{ data: RoutingRule[] }>(
    RULES_KEY,
    '/admin/api/payments/routing-rules',
  );

  const processors = useMemo(() => processorsQuery.data?.data ?? [], [processorsQuery.data]);
  const serverDrafts = useMemo(() => toDrafts(rulesQuery.data?.data ?? []), [rulesQuery.data]);

  // null = untouched; the table renders straight from the server until edited.
  const [edited, setEdited] = useState<RuleDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const drafts = edited ?? serverDrafts;
  const validation = validateDrafts(drafts, currency);

  const strip = (list: RuleDraft[]) => list.map(({ key, ...rest }) => rest);
  const dirty =
    edited !== null && JSON.stringify(strip(edited)) !== JSON.stringify(strip(serverDrafts));

  const discard = () => {
    setEdited(null);
    setShowErrors(false);
  };

  const save = () => {
    if (!validation.valid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    apiFetch<{ data: RoutingRule[] }>('/admin/api/payments/routing-rules', {
      method: 'PUT',
      body: { rules: toRulesInput(drafts, currency) },
    })
      .then((saved) => {
        queryClient.setQueryData(RULES_KEY, saved);
        setEdited(null);
        setShowErrors(false);
        toast.show('Payment routing saved');
      })
      .catch((cause: ApiError) => toast.error(cause.message))
      .finally(() => setSaving(false));
  };

  const refreshProcessors = () => {
    queryClient.invalidateQueries({ queryKey: PROCESSORS_KEY });
    // Disconnecting removes that processor's rules server-side.
    queryClient.invalidateQueries({ queryKey: RULES_KEY });
  };

  return (
    <SettingsPage
      title="Payments"
      loading={processorsQuery.isPending || rulesQuery.isPending}
      form={{ dirty, saving, save, discard }}
    >
      <BlockStack gap="400">
        <ProvidersCard configs={processors} refresh={refreshProcessors} />

        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Payment routing
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Split traffic between providers by weight, optionally limited to certain card brands
                or order amounts. If a provider has a network or server error, the next one in order
                is tried automatically — but a declined card is never retried on another provider.
              </Text>
            </BlockStack>

            {processors.length === 0 ? (
              <Text as="p" tone="subdued">
                Connect a payment provider above to start routing charges between them.
              </Text>
            ) : drafts.length === 0 ? (
              <Text as="p" tone="subdued">
                No routing rules. All charges go to your connected providers in the order they were
                connected.
              </Text>
            ) : (
              <BlockStack gap="400">
                {drafts.map((draft, index) => (
                  <RuleRow
                    key={draft.key}
                    draft={draft}
                    index={index}
                    count={drafts.length}
                    processors={processors}
                    error={showErrors ? validation.byKey[draft.key] : undefined}
                    onChange={(patch) =>
                      setEdited(drafts.map((d) => (d.key === draft.key ? { ...d, ...patch } : d)))
                    }
                    onMove={(direction) => setEdited(moveRule(drafts, index, direction))}
                    onRemove={() => setEdited(drafts.filter((d) => d.key !== draft.key))}
                  />
                ))}
              </BlockStack>
            )}

            {/* Not rendered rather than disabled: with no provider connected the
                button can do nothing, and a dead control is worse than none
                (CLAUDE.md §8). */}
            {processors.length === 0 ? null : (
              <InlineStack>
                <Button
                  onClick={() => setEdited([...drafts, newRuleDraft(processors[0]?.id ?? '')])}
                >
                  Add rule
                </Button>
              </InlineStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </SettingsPage>
  );
}
