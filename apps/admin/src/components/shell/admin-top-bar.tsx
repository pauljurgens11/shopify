'use client';

/**
 * Top bar: search, notifications, store menu (PARITY.md "Global chrome").
 * Owner: WS-A.
 *
 * The search is real, not a placeholder — it fans out to the products, orders
 * and customers list endpoints and groups what comes back. Groups whose
 * endpoint has not landed yet simply report nothing (see `lib/search.ts`).
 */
import type { SessionResponse } from '@merchant/contracts/auth';
import { ActionList, Avatar, Box, Card, Icon, InlineStack, Text, TopBar } from '@shopify/polaris';
import { NotificationIcon } from '@shopify/polaris-icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { storeHref } from '../../lib/nav.ts';
import { type SearchHit, useDebouncedValue, useSearch } from '../../lib/search.ts';
import { useLogout } from '../../lib/session.ts';
import { BrandWordmark } from './brand-logo.tsx';

/**
 * The keyboard hint sitting inside the search field. Polaris's `SearchField`
 * takes no children, so this is the §7 escape hatch: plain JSX, `--p-*` tokens
 * only, positioned over the field the way Shopify's admin shows it.
 *
 * docs/parity/admin-shell.md: TWO small keycaps (`⌘` then `K`), not one chip
 * with both characters in it.
 */
function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'var(--p-space-500)',
        height: 'var(--p-space-500)',
        color: 'var(--p-color-text-inverse-secondary)',
        fontFamily: 'var(--p-font-family-sans)',
        fontSize: 'var(--p-font-size-275)',
        lineHeight: 1,
        padding: '0 var(--p-space-100)',
        border: 'var(--p-border-width-025) solid var(--p-color-border-inverse)',
        borderRadius: 'var(--p-border-radius-100)',
      }}
    >
      {children}
    </span>
  );
}

function ShortcutHint({ keys }: { keys: readonly string[] }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: 'var(--p-space-200)',
        display: 'inline-flex',
        gap: 'var(--p-space-100)',
        pointerEvents: 'none',
      }}
    >
      {keys.map((key) => (
        <Keycap key={key}>{key}</Keycap>
      ))}
    </span>
  );
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || 'M'
  );
}

export function AdminTopBar({
  session,
  onNavigationToggle,
}: {
  session: SessionResponse;
  onNavigationToggle: () => void;
}) {
  const router = useRouter();
  const logout = useLogout();
  const slug = session.shop.slug;

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Set after mount, never during render: the server has no navigator, and
  // guessing would print "Ctrl" on a Mac for one frame and then swap it.
  const [shortcut, setShortcut] = useState<readonly string[] | null>(null);
  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.userAgent) ? ['\u2318', 'K'] : ['Ctrl', 'K']);
  }, []);

  // Debounced: a word is one request, not one per keystroke. The raw query
  // still drives panel visibility, so opening and clearing feel instant.
  const debouncedQuery = useDebouncedValue(query, 250);
  const { data: groups, isFetching, isError } = useSearch(debouncedQuery);

  const hasQuery = query.trim().length > 0;

  const dismissSearch = useCallback(() => {
    setQuery('');
    setSearchFocused(false);
  }, []);

  const openHit = useCallback(
    (hit: SearchHit) => {
      dismissSearch();
      router.push(storeHref(slug, hit.url));
    },
    [dismissSearch, router, slug],
  );

  // Results are grouped for display but navigated as one list, so the arrow
  // keys cross from the last product into the first order the way Shopify's do.
  const flatHits = useMemo(() => (groups ?? []).flatMap((group) => group.hits), [groups]);
  const [activeIndex, setActiveIndex] = useState(0);

  // A new query means new results; leaving the old index would highlight an
  // unrelated row and Enter would open it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resets per result set
  useEffect(() => setActiveIndex(0), [flatHits]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K / Ctrl+K focuses the search field, the way Shopify's does.
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchFocused(true);
        return;
      }

      // Escape leaves the search whether or not anything is typed — a focused
      // empty field that will not let go reads as a stuck modal.
      if (event.key === 'Escape' && (hasQuery || searchFocused)) {
        event.preventDefault();
        dismissSearch();
        return;
      }

      if (!hasQuery || flatHits.length === 0) return;

      // Wrap around: from the last hit, ArrowDown returns to the first.
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % flatHits.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + flatHits.length) % flatHits.length);
      } else if (event.key === 'Enter') {
        const hit = flatHits[activeIndex];
        if (hit) {
          event.preventDefault();
          openHit(hit);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasQuery, searchFocused, flatHits, activeIndex, dismissSearch, openHit]);

  const searchSections = useMemo(() => {
    let index = 0;
    return (groups ?? []).map((group) => ({
      title: group.title,
      items: group.hits.map((hit) => {
        // Index into the flattened list, so the highlight and the arrow keys
        // agree across group boundaries.
        const itemIndex = index;
        index += 1;
        return {
          content: hit.title,
          helpText: hit.subtitle,
          active: itemIndex === activeIndex,
          onAction: () => openHit(hit),
        };
      }),
    }));
  }, [groups, activeIndex, openHit]);

  const hasResults = searchSections.length > 0;

  const searchResults = hasQuery ? (
    <Card padding="200">
      {hasResults ? (
        <ActionList actionRole="menuitem" sections={searchSections} />
      ) : (
        <Box padding="400">
          <Text as="p" tone="subdued">
            {isError
              ? 'Couldn\u2019t search. Check your connection and try again.'
              : isFetching || query.trim() !== debouncedQuery.trim()
                ? 'Searching\u2026'
                : `No results for \u201c${query.trim()}\u201d`}
          </Text>
        </Box>
      )}
    </Card>
  ) : null;

  return (
    <TopBar
      showNavigationToggle
      onNavigationToggle={onNavigationToggle}
      // docs/parity/admin-shell.md: the bar opens with the wordmark AND the
      // glyph. `Frame.logo` only takes an image src, so the wordmark rides in
      // through the slot Polaris leaves right after it.
      logoSuffix={<BrandWordmark size={18} tone="inverse" />}
      searchResultsVisible={hasQuery}
      searchField={
        // The wrapper inherits the search field's own flex sizing, so the field
        // stays centred in the bar; it exists only to position the ⌘K hint.
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: '1 1 auto',
            alignItems: 'center',
          }}
        >
          <TopBar.SearchField
            value={query}
            placeholder="Search"
            focused={searchFocused}
            showFocusBorder
            onChange={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onCancel={dismissSearch}
          />
          {/* Hidden once the field is in use: the clear button lives there. */}
          {shortcut && !hasQuery && !searchFocused ? <ShortcutHint keys={shortcut} /> : null}
        </div>
      }
      searchResults={searchResults}
      onSearchResultsDismiss={dismissSearch}
      secondaryMenu={
        <TopBar.Menu
          accessibilityLabel="Notifications"
          activatorContent={
            <InlineStack blockAlign="center">
              <Icon source={NotificationIcon} />
            </InlineStack>
          }
          open={notificationsOpen}
          onOpen={() => setNotificationsOpen(true)}
          onClose={() => setNotificationsOpen(false)}
          // Nothing produces admin notifications yet. An empty popover is
          // Shopify's own empty state and is honest; a bell that swallows the
          // click is not (CLAUDE.md §8).
          actions={[{ items: [{ content: 'No new notifications', disabled: true }] }]}
        />
      }
      userMenu={
        // `TopBar.Menu` rather than `TopBar.UserMenu`, for two PARITY.md lines
        // its API cannot express: the chip reads initials-square-then-shop-name
        // (UserMenu renders the text first), and the popover opens with the shop
        // name as a header (`UserMenu.actions` is typed without section titles).
        // Same Polaris subcomponent the notifications bell already uses, in its
        // `userMenu` variant — the chip styling is still Polaris's.
        <TopBar.Menu
          accessibilityLabel="Store menu"
          userMenu
          activatorContent={
            <>
              <Avatar size="md" initials={initialsOf(session.shop.name)} name={session.shop.name} />
              <span style={{ maxWidth: '10rem', padding: '0 var(--p-space-200)' }}>
                <Text as="p" variant="bodySm" fontWeight="medium" alignment="start" truncate>
                  {session.shop.name}
                </Text>
              </span>
            </>
          }
          open={userMenuOpen}
          onOpen={() => setUserMenuOpen(true)}
          onClose={() => setUserMenuOpen(false)}
          actions={[
            {
              title: session.shop.name,
              items: [
                {
                  content: 'Log out',
                  onAction: () => {
                    // Clear the session first; the login page must not race a
                    // still-cached /auth/me and bounce straight back in.
                    logout.mutate(undefined, { onSettled: () => router.replace('/login') });
                  },
                },
              ],
            },
          ]}
        />
      }
    />
  );
}
