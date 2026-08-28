import type { PermissionArea } from '@merchant/config/constants';

export type NavItem = {
  /** Stable key, also the items/<key>.ts filename. */
  key: string;
  label: string;
  /** Path relative to /store/{shopSlug}. */
  url: string;
  /** Name of a @shopify/polaris-icons export, resolved in the Navigation shell. */
  icon: string;
  /** Hidden when the staff user lacks this permission (Shopify behaviour, SPEC §9). */
  permission?: PermissionArea;
  /** Shopify shows a count badge on Orders. */
  badge?: 'openOrders';
  subItems?: Array<{ label: string; url: string; permission?: PermissionArea }>;
  /** Settings is pinned to the bottom of the nav. */
  position?: 'main' | 'bottom';
};
