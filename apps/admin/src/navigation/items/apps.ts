import type { NavItem } from '../types.ts';
// Shopify groups apps under a bold `Apps` header (docs/parity/admin-shell.md).
// Its rows are the installed apps; ours is the one page that lists and creates
// this shop's custom apps, so the row is named for what it opens rather than
// repeating the header.
export const apps: NavItem = {
  key: 'apps',
  label: 'Custom apps',
  url: '/apps',
  icon: 'AppsIcon',
  permission: 'apps',
  section: 'apps',
};
