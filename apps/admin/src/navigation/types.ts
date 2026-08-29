import type { PermissionArea } from '@merchant/config/constants';

/**
 * The bold, smaller headers Shopify puts above the last two groups of the left
 * nav (docs/parity/admin-shell.md § Navigation). Everything without one belongs
 * to the unlabelled main list at the top.
 */
export type NavSectionKey = 'sales-channels' | 'apps';

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
  /** Grouped under a section header instead of the main list. */
  section?: NavSectionKey;
  /** Settings is pinned to the bottom of the nav. */
  position?: 'main' | 'bottom';
};

/** One rendered `Navigation.Section`. */
export type NavSection = {
  key: string;
  /** Absent for the unlabelled main list. */
  title?: string;
  items: NavItem[];
};
