import type { NavItem } from '../types.ts';
export const orders: NavItem = {
  key: 'orders',
  label: 'Orders',
  url: '/orders',
  icon: 'OrderIcon',
  permission: 'orders',
  // No Drafts subitem: draft orders are out of scope (SPEC §2) and PARITY.md's
  // nav list has none — a subitem leading to a placeholder is a parity tell.
  badge: 'openOrders',
};
