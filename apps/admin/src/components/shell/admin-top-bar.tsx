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
import { ActionList, Card, Icon, InlineStack, Text, TopBar } from '@shopify/polaris';
import { NotificationIcon } from '@shopify/polaris-icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { storeHref } from '../../lib/nav.ts';
import { useSearch } from '../../lib/search.ts';
import { useLogout } from '../../lib/session.ts';

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

  const { data: groups, isFetching } = useSearch(query);

  // ⌘K / Ctrl+K focuses the search field, the way Shopify's does.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchFocused(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const dismissSearch = useCallback(() => {
    setQuery('');
    setSearchFocused(false);
  }, []);

  const searchSections = useMemo(
    () =>
      (groups ?? []).map((group) => ({
        title: group.title,
        items: group.hits.map((hit) => ({
          content: hit.title,
          helpText: hit.subtitle,
          onAction: () => {
            dismissSearch();
            router.push(storeHref(slug, hit.url));
          },
        })),
      })),
    [groups, dismissSearch, router, slug],
  );

  const hasQuery = query.trim().length > 0;
  const hasResults = searchSections.length > 0;

  const searchResults = hasQuery ? (
    <Card padding="200">
      {hasResults ? (
        <ActionList actionRole="menuitem" sections={searchSections} />
      ) : (
        <div style={{ padding: 'var(--p-space-400)' }}>
          <Text as="p" tone="subdued">
            {isFetching ? 'Searching…' : `No results for “${query.trim()}”`}
          </Text>
        </div>
      )}
    </Card>
  ) : null;

  return (
    <TopBar
      showNavigationToggle
      onNavigationToggle={onNavigationToggle}
      searchResultsVisible={hasQuery}
      searchField={
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
        <TopBar.UserMenu
          name={session.shop.name}
          detail={session.user.email}
          initials={initialsOf(session.shop.name)}
          open={userMenuOpen}
          onToggle={() => setUserMenuOpen((open) => !open)}
          actions={[
            {
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
