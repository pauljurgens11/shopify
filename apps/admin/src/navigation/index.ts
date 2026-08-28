/**
 * Admin navigation registry (SPEC §9). Owner: WS-A.
 *
 * This file is ALREADY COMPLETE — every nav item in SPEC §9 exists. Edit your
 * workstream's file in `items/`, not this one. That is what keeps the left nav
 * from becoming a merge conflict on every PR (CLAUDE.md §3).
 *
 * Order here is the order Shopify renders, top to bottom.
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
import type { NavItem } from './types.ts';

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

export const MAIN_NAV = NAVIGATION.filter((i) => i.position !== 'bottom');
export const BOTTOM_NAV = NAVIGATION.filter((i) => i.position === 'bottom');

export type { NavItem };
