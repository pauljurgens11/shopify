'use client';

/**
 * Left navigation (SPEC §9, docs/parity/admin-shell.md). Owner: WS-A.
 *
 * Renders whatever `src/navigation/` holds, in that order — this file never
 * names an item. Adding or reordering nav happens in `navigation/items/`.
 *
 * Selection is passed explicitly rather than left to Polaris's own URL
 * matching: Products has to stay lit on `/collections` and `/inventory`, which
 * are sibling URLs, not children of `/products`. See `lib/nav.ts`.
 */
import type { SessionResponse } from '@merchant/contracts/auth';
import { Navigation } from '@shopify/polaris';
import * as PolarisIcons from '@shopify/polaris-icons';
import { usePathname } from 'next/navigation';
import { isItemSelected, isSubItemSelected, storeHref, visibleNav } from '../../lib/nav.ts';
import { viewerOf } from '../../lib/session.ts';
import { BOTTOM_NAV, NAV_SECTIONS, type NavItem } from '../../navigation/index.ts';

type IconComponent = (typeof PolarisIcons)['HomeIcon'];

/** `'HomeIcon'` → the component. The registry stores names so it stays data. */
function icon(name: string): IconComponent | undefined {
  return (PolarisIcons as unknown as Record<string, IconComponent | undefined>)[name];
}

export function AdminNavigation({
  session,
  openOrders,
}: {
  session: SessionResponse;
  openOrders?: number;
}) {
  const pathname = usePathname();
  const slug = session.shop.slug;
  const viewer = viewerOf(session);

  const toPolaris = (item: NavItem) => {
    const url = storeHref(slug, item.url);
    const subItems = item.subItems ?? [];

    return {
      label: item.label,
      icon: icon(item.icon),
      url,
      selected: isItemSelected(pathname, slug, item),
      // No onClick: the anchor is a Next `Link` via AppProvider's
      // linkComponent, so routing is already client-side. Pushing here too
      // would navigate twice.
      // Shopify shows the open-order count beside Orders, and nothing at zero.
      ...(item.badge === 'openOrders' && openOrders
        ? { badge: openOrders >= 50 ? '50+' : String(openOrders) }
        : {}),
      ...(subItems.length > 0
        ? {
            subNavigationItems: subItems.map((sub) => ({
              label: sub.label,
              url: storeHref(slug, sub.url),
              matches: isSubItemSelected(pathname, slug, sub.url),
            })),
          }
        : {}),
    };
  };

  // A section a staff user cannot see any of is dropped entirely rather than
  // left as a header with nothing under it.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: visibleNav(section.items, viewer),
  })).filter((section) => section.items.length > 0);

  return (
    <Navigation location={pathname}>
      {/* `Sales channels` and `Apps` carry a header; the main list does not.
          `fill` goes on the LAST visible section so the groups stack from the
          top and the slack below them is what pins Settings to the bottom. */}
      {sections.map((section, index) => (
        <Navigation.Section
          key={section.key}
          title={section.title}
          fill={index === sections.length - 1}
          items={section.items.map(toPolaris)}
        />
      ))}
      <Navigation.Section items={visibleNav(BOTTOM_NAV, viewer).map(toPolaris)} />
    </Navigation>
  );
}
