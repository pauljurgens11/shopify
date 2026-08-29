import type { NavItem } from '../types.ts';
// Shopify lists the shop's own channel as `Online Store`, under the bold
// `Sales channels` header near the bottom of the nav (docs/parity/admin-shell.md).
// Deviation #2 (SPEC §12) only changes what the page behind it is — the AI
// builder instead of the theme editor — not what the row is called.
export const storefront: NavItem = {
  key: 'storefront',
  label: 'Online Store',
  url: '/storefront',
  icon: 'StoreOnlineIcon',
  permission: 'builder',
  section: 'sales-channels',
};
