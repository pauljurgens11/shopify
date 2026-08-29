/**
 * Admin navigation registry (SPEC §9, docs/parity/admin-shell.md). Owner: WS-A.
 *
 * This file is ALREADY COMPLETE — every nav item in SPEC §9 exists. Edit your
 * workstream's file in `items/`, not this one. That is what keeps the left nav
 * from becoming a merge conflict on every PR (CLAUDE.md §3).
 *
 * Order here is the order Shopify renders, top to bottom. The capture puts the
 * last two groups under bold section headers — `Sales channels` then `Apps` —
 * and pins `Settings` to the bottom; items behind SPEC §2 (Growth, Content,
 * Markets, Finance, Purchase orders, Transfers, Gift cards, Segments,
 * Companies, Agentic) are absent rather than disabled, per CLAUDE.md §8.
 */
import { analytics } from './items/analytics.ts';
import { apps } from './items/apps.ts';
import { customers } from './items/customers.ts';
import { discounts } from './items/discounts.ts';
import { home } from './items/home.ts';
import { marketing } from './items/marketing.ts';
import { orders } from './items/orders.ts';
import { products } from './items/products.ts';
import { settings } from './items/settings.ts';
import { storefront } from './items/storefront.ts';
import type { NavItem, NavSection } from './types.ts';

export const NAVIGATION: NavItem[] = [
  home,
  orders,
  products,
  customers,
  marketing,
  discounts,
  analytics,
  storefront,
  apps,
  settings,
];

const inSection = (section: NavItem['section']) =>
  NAVIGATION.filter((item) => item.position !== 'bottom' && item.section === section);

/** The sections above `Settings`, in render order. */
export const NAV_SECTIONS: NavSection[] = [
  { key: 'main', items: inSection(undefined) },
  { key: 'sales-channels', title: 'Sales channels', items: inSection('sales-channels') },
  { key: 'apps', title: 'Apps', items: inSection('apps') },
];

export const MAIN_NAV = NAVIGATION.filter((i) => i.position !== 'bottom');
export const BOTTOM_NAV = NAVIGATION.filter((i) => i.position === 'bottom');

export type { NavItem, NavSection };
