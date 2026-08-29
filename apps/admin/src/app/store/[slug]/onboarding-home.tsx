'use client';

/**
 * Onboarding Home — the variant Shopify serves a store with no history
 * (docs/parity/home.md, captured in full). Owner: WS-G.
 *
 * Shopify serves Home in two forms and switches on the store, not on a
 * setting: an onboarding page for new/empty stores and the dashboard for
 * established ones. `home.md` documents the first exactly — "Use it if we ever
 * render a genuinely empty tenant" — and `dashboard.md` the second. A store
 * with no orders gets this page; the moment it has one it gets
 * `dashboard-home.tsx` instead.
 *
 * The shape that makes it read as Shopify, straight off the capture:
 *
 * - **No page header.** Content starts under the top bar, centred in a single
 *   column rather than the admin's usual two-column card grid.
 * - A trial promo pill, a two-line welcome heading, a rounded AI prompt input,
 *   then the setup cards as a two-column `<ul>` grid.
 * - **Everything is dismissible** — every card, the welcome block and the pill.
 *   Onboarding is disposable chrome, not permanent furniture.
 * - **The whole card is the click target**, with its action button as a visual
 *   affordance rather than the only hit area.
 *
 * Cards 5, 7 and 8 of the capture (custom domain, "Optimize your store in
 * Estonia", EU right of withdrawal) are not rendered: we ship no domains,
 * markets or country-specific setup surface, and a card whose button opens
 * nothing is worse than an absent one (CLAUDE.md §8). See DECISIONS.md.
 */
import { BRAND_NAME } from '@merchant/config/constants';
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  Modal,
  Page,
  Text,
  TextField,
} from '@shopify/polaris';
import { ArrowUpIcon, MagicIcon, XIcon, XSmallIcon } from '@shopify/polaris-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../components/shell/toast-provider.tsx';
import { type ApiError, apiFetch, useApiQuery } from '../../../lib/api.ts';
import { SESSION_KEY, type SessionResponse } from '../../../lib/session.ts';
import { CONVERSATION_KEY, VERSIONS_KEY } from './storefront/use-builder.ts';

/* -------------------------------------------------------------------------- */
/* Dismissal                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Dismissals persist per browser and per shop. `Shop.onboarding` has a single
 * `dismissed` flag, not one per card, so persisting server-side would be a
 * schema change for chrome; a dismissal that comes back on reload reads as a
 * bug, which is the worse of the two.
 *
 * Only ever read from an effect-free lazy initializer on the client: this
 * component is never reached during SSR (Home renders a skeleton until the
 * session and the order probe resolve), and the `window` guard covers the rest.
 */
const dismissKey = (shopId: string) => `merchant:home-onboarding-dismissed:${shopId}`;

function readDismissed(shopId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(dismissKey(shopId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // Private mode, quota, or a hand-edited value: an undismissed page is a
    // fine fallback, an exploding one is not.
    return [];
  }
}

function useDismissed(shopId: string) {
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed(shopId));

  const dismiss = useCallback(
    (id: string) => {
      setDismissed((current) => {
        if (current.includes(id)) return current;
        const next = [...current, id];
        try {
          window.localStorage.setItem(dismissKey(shopId), JSON.stringify(next));
        } catch {
          // Dismissing still works for this session even if it cannot be stored.
        }
        return next;
      });
    },
    [shopId],
  );

  return { dismissed, dismiss };
}

/* -------------------------------------------------------------------------- */
/* Trial promo pill                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Top-right, over the content: a dark rounded pill split in two by a hairline —
 * the offer on the left, a plan link on the right. Hand-built from `--p-*`
 * tokens because Polaris ships no dark split pill (CLAUDE.md §7).
 */
function TrialPill({
  slug,
  currencyCode,
  onClose,
}: {
  slug: string;
  currencyCode: string;
  onClose: () => void;
}) {
  // A marketing price, not a computed one — formatted, never used in arithmetic.
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(1);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--p-space-300)',
        background: 'var(--p-color-bg-fill-brand)',
        color: 'var(--p-color-text-brand-on-bg-fill)',
        borderRadius: 'var(--p-border-radius-full)',
        padding: 'var(--p-space-150) var(--p-space-200) var(--p-space-150) var(--p-space-400)',
        fontSize: 'var(--p-font-size-325)',
        lineHeight: 'var(--p-font-line-height-500)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--p-space-200)' }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--p-border-radius-full)',
            background: 'var(--p-color-bg-fill-success-secondary)',
            display: 'inline-block',
          }}
        />
        {`Get 3 months for ${price}/month`}
      </span>

      <span
        aria-hidden="true"
        style={{ width: 1, alignSelf: 'stretch', background: 'var(--p-color-border-inverse)' }}
      />

      <a
        href={`/store/${slug}/settings/plan`}
        style={{
          color: 'inherit',
          textDecoration: 'none',
          fontWeight: 'var(--p-font-weight-medium)',
        }}
      >
        Select a plan
      </a>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          padding: 0,
          border: 'none',
          borderRadius: 'var(--p-border-radius-full)',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AI prompt input                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The placeholder rotates, as it does on the real page. Shopify's four suggest
 * what Sidekick can do; ours suggest what OUR assistant can do — it designs
 * storefronts (SPEC §12) — because a placeholder that proposes something the
 * assistant cannot do is a promise the next screen breaks. DECISIONS.md.
 */
const PLACEHOLDERS = [
  'Describe the storefront you want',
  'Make it feel like a Kyoto coffee shop',
  'Help me get started',
  'Warmer palette, bigger hero',
];
const PLACEHOLDER_MS = 4000;

function useRotatingPlaceholder(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    // Text swapping under the cursor is motion; honor the OS preference the
    // same way the rest of the admin does (PARITY.md §Motion).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % PLACEHOLDERS.length),
      PLACEHOLDER_MS,
    );
    return () => window.clearInterval(timer);
  }, [active]);

  return PLACEHOLDERS[index] ?? PLACEHOLDERS[0] ?? '';
}

/**
 * Sending posts the message to the same conversation the storefront builder
 * reads, then hands over to it — so the prompt typed here is already being
 * worked on by the time the builder paints, rather than being retyped there.
 */
function AiPrompt({ slug }: { slug: string }) {
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const placeholder = useRotatingPlaceholder(value.length === 0 && !sending);

  async function submit() {
    const message = value.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      await apiFetch('/admin/api/themes/conversation', { method: 'POST', body: { message } });
      await Promise.all([
        client.invalidateQueries({ queryKey: CONVERSATION_KEY }),
        client.invalidateQueries({ queryKey: VERSIONS_KEY }),
      ]);
      router.push(`/store/${slug}/storefront`);
    } catch (cause) {
      toast.error((cause as ApiError).message);
      setSending(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--p-space-300)',
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        background: 'var(--p-color-bg-surface)',
        border: 'var(--p-border-width-025) solid var(--p-color-border)',
        borderRadius: 'var(--p-border-radius-full)',
        boxShadow: 'var(--p-shadow-100)',
        padding: 'var(--p-space-200) var(--p-space-200) var(--p-space-200) var(--p-space-300)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 'var(--p-border-radius-full)',
          background: 'var(--p-color-bg-surface-magic)',
        }}
      >
        <Icon source={MagicIcon} tone="magic" />
      </span>

      <input
        type="text"
        aria-label="Ask about your store"
        value={value}
        placeholder={placeholder}
        disabled={sending}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          void submit();
        }}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontFamily: 'var(--p-font-family-sans)',
          fontSize: 'var(--p-font-size-325)',
          color: 'var(--p-color-text)',
        }}
      />

      <span style={{ borderRadius: 'var(--p-border-radius-full)', overflow: 'hidden' }}>
        <Button
          variant="primary"
          icon={ArrowUpIcon}
          accessibilityLabel="Send"
          loading={sending}
          disabled={!value.trim()}
          onClick={() => void submit()}
        />
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Setup cards                                                                 */
/* -------------------------------------------------------------------------- */

type SetupCard = {
  id: string;
  heading: string;
  body: string;
  actionLabel: string;
  /** `null` when the action opens a modal rather than navigating. */
  href: string | null;
  done: boolean;
};

/**
 * One setup card. The capture's card is *itself* a button wrapping further
 * buttons, which no browser will parse — a nested `<button>` is closed early
 * and the inner controls fall outside it. So the hit area is a transparent
 * `<button>` stretched over the card instead, painted under the two real
 * controls: `Dismiss card` and the action are both positioned, so they come out
 * on top of the overlay and take their own clicks. Same target, same keyboard
 * behaviour, valid markup.
 */
function SetupCardItem({
  card,
  onActivate,
  onDismiss,
}: {
  card: SetupCard;
  onActivate: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--p-space-200)',
          minHeight: 168,
        }}
      >
        <button
          type="button"
          aria-label={card.heading}
          onClick={onActivate}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 'var(--p-border-radius-300)',
          }}
        />

        <div style={{ position: 'absolute', insetBlockStart: 0, insetInlineEnd: 0 }}>
          <Button
            variant="tertiary"
            icon={XSmallIcon}
            accessibilityLabel="Dismiss card"
            onClick={onDismiss}
          />
        </div>

        {card.done ? (
          <InlineStack>
            <Badge tone="success">Done</Badge>
          </InlineStack>
        ) : null}

        <Box paddingInlineEnd="800">
          <Text as="h3" variant="headingMd">
            {card.heading}
          </Text>
        </Box>

        <Text as="p" variant="bodySm" tone="subdued">
          {card.body}
        </Text>

        {/* Pinned bottom-left, per the capture. */}
        <div style={{ marginBlockStart: 'auto', position: 'relative', width: 'fit-content' }}>
          {card.done ? null : <Button onClick={onActivate}>{card.actionLabel}</Button>}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Name-your-store modal                                                       */
/* -------------------------------------------------------------------------- */

/** Card 4's action opens a modal rather than navigating, exactly as captured. */
function NameStoreModal({
  open,
  currentName,
  onClose,
}: {
  open: boolean;
  currentName: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  // Reopening starts from what is stored, never from an abandoned edit.
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await apiFetch('/admin/api/settings/general', { method: 'PUT', body: { name: trimmed } });
      await Promise.all([
        client.invalidateQueries({ queryKey: SESSION_KEY }),
        client.invalidateQueries({ queryKey: ['settings', 'general'] }),
      ]);
      toast.show('Settings saved');
      onClose();
    } catch (cause) {
      toast.error((cause as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Name your store"
      primaryAction={{
        content: 'Save',
        onAction: () => void save(),
        loading: saving,
        disabled: !name.trim(),
      }}
      secondaryActions={[{ content: 'Cancel', onAction: onClose }]}
    >
      <Modal.Section>
        <TextField
          label="Store name"
          name="shopName"
          autoComplete="organization"
          value={name}
          onChange={setName}
          helpText="Customers will see this across your storefront, emails, and checkout."
        />
      </Modal.Section>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* The page                                                                    */
/* -------------------------------------------------------------------------- */

type ListResponse = { data: unknown[] };
type ThemeVersions = { data: { status: string }[] };
type Processors = { data: { enabled: boolean }[] };

const WELCOME_ID = 'welcome';
const PROMO_ID = 'promo';

export function OnboardingHome({ session }: { session: SessionResponse }) {
  const router = useRouter();
  const { slug, id: shopId, name: shopName } = session.shop;
  const { dismissed, dismiss } = useDismissed(shopId);
  const [renaming, setRenaming] = useState(false);

  // One query per check, so a check the viewer lacks permission for degrades to
  // "not done" instead of blanking the page.
  const products = useApiQuery<ListResponse>(
    ['onboarding', 'products'],
    '/admin/api/products?limit=1',
  );
  const themes = useApiQuery<ThemeVersions>(['onboarding', 'themes'], '/admin/api/themes/versions');
  const processors = useApiQuery<Processors>(
    ['onboarding', 'processors'],
    '/admin/api/payments/processors',
  );

  const cards: SetupCard[] = [
    {
      id: 'add-product',
      heading: 'Add your first product',
      body: 'Start with a title, price, and a photo. You can always add more detail later.',
      actionLabel: 'Add product',
      href: `/store/${slug}/products/new`,
      done: (products.data?.data.length ?? 0) > 0,
    },
    {
      id: 'store-design',
      heading: 'Choose your store design',
      body: 'Pick a theme that fits your brand, then customize from there.',
      actionLabel: 'Choose theme',
      href: `/store/${slug}/storefront`,
      done: (themes.data?.data ?? []).some((version) => version.status === 'published'),
    },
    {
      id: 'payments',
      heading: 'You’re ready to accept payments',
      body: 'Review settings to accept more payment methods and add a payout account.',
      actionLabel: 'Review payments',
      href: `/store/${slug}/settings/payments`,
      done: (processors.data?.data ?? []).some((processor) => processor.enabled),
    },
    {
      id: 'store-name',
      heading: 'Name your store',
      body: 'Customers will see this across your storefront, emails, and checkout.',
      actionLabel: 'Add name',
      href: null,
      done: false,
    },
    {
      id: 'shipping',
      heading: 'Review shipping rates',
      body: 'Look over the defaults set up for you based on your location.',
      actionLabel: 'Review rates',
      href: `/store/${slug}/settings/shipping`,
      done: false,
    },
  ];

  const visible = cards.filter((card) => !dismissed.includes(card.id));

  // The grid waits for all three checks; the welcome block and the prompt do
  // not. Rendering a card before its check answers means `Done` pops in and the
  // action button vanishes under the cursor a moment later — and on a shop made
  // at signup that is guaranteed to happen, because the theme is already
  // published (DEMO.md, "A second shop"). Nothing above the grid moves while it
  // waits, so this is a late arrival rather than a layout shift.
  const checking = products.isPending || themes.isPending || processors.isPending;

  return (
    // `Page` with no title, no actions and no breadcrumbs renders its padding
    // and nothing else — which is the capture's "no page header, content begins
    // directly under the top bar", with the admin's own gutters kept.
    <Page>
      <div style={{ maxWidth: 820, margin: '0 auto', width: '100%' }}>
        <BlockStack gap="600">
          {dismissed.includes(PROMO_ID) ? null : (
            <InlineStack align="end">
              <TrialPill
                slug={slug}
                currencyCode={session.shop.currencyCode}
                onClose={() => dismiss(PROMO_ID)}
              />
            </InlineStack>
          )}

          {dismissed.includes(WELCOME_ID) ? null : (
            <Box position="relative">
              <Text as="h1" variant="heading2xl" alignment="center" fontWeight="semibold">
                {`Welcome to ${BRAND_NAME}!`}
                <br />
                Where do you want to start?
              </Text>
              <Box position="absolute" insetBlockStart="0" insetInlineEnd="0">
                <Button
                  variant="tertiary"
                  icon={XIcon}
                  accessibilityLabel="Dismiss"
                  onClick={() => dismiss(WELCOME_ID)}
                />
              </Box>
            </Box>
          )}

          <AiPrompt slug={slug} />

          {!checking && visible.length > 0 ? (
            <ul
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 'var(--p-space-400)',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {visible.map((card) => (
                <li key={card.id}>
                  <SetupCardItem
                    card={card}
                    onActivate={() => (card.href ? router.push(card.href) : setRenaming(true))}
                    onDismiss={() => dismiss(card.id)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </BlockStack>

        <NameStoreModal open={renaming} currentName={shopName} onClose={() => setRenaming(false)} />
      </div>
    </Page>
  );
}
