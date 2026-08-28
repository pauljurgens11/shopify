import type { NavItem } from '../types.ts';
// SPEC §9: render the nav item, keep the page minimal.
export const marketing: NavItem = {
  key: 'marketing',
  label: 'Marketing',
  url: '/marketing',
  icon: 'MarketsIcon',
  permission: 'analytics',
};
