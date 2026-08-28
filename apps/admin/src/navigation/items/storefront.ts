import type { NavItem } from '../types.ts';
// Deviation #2 (SPEC §12): replaces Shopify's "Online Store" nav item.
export const storefront: NavItem = {
  key: 'storefront',
  label: 'Storefront',
  url: '/storefront',
  icon: 'PaintBrushFlatIcon',
  permission: 'builder',
};
