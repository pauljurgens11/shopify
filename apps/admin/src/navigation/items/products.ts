import type { NavItem } from '../types.ts';
export const products: NavItem = {
  key: 'products',
  label: 'Products',
  url: '/products',
  icon: 'ProductIcon',
  permission: 'products',
  subItems: [
    { label: 'Collections', url: '/collections', permission: 'products' },
    { label: 'Inventory', url: '/inventory', permission: 'products' },
  ],
};
