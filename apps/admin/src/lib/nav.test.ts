/**
 * Navigation visibility and selection (SPEC §8, §9).
 *
 * Two things here are easy to get subtly wrong and loud when they are:
 * a staff user seeing a section they cannot open, and the wrong nav item
 * looking selected. Both are pure functions, so both get tested.
 */
import { describe, expect, it } from 'vitest';
import { MAIN_NAV, NAVIGATION, type NavItem } from '../navigation/index.ts';
import { isItemSelected, isSubItemSelected, storeHref, type Viewer, visibleNav } from './nav.ts';

const owner: Viewer = { role: 'owner', permissions: {} };
const admin: Viewer = { role: 'admin', permissions: {} };
const staff = (permissions: Viewer['permissions']): Viewer => ({ role: 'staff', permissions });

describe('visibleNav', () => {
  it('shows owner and admin everything, whatever the permission map says', () => {
    for (const viewer of [owner, admin]) {
      expect(visibleNav(NAVIGATION, viewer).map((i) => i.key)).toEqual(
        NAVIGATION.map((i) => i.key),
      );
    }
  });

  it('shows a staff user only the areas they hold', () => {
    const viewer = staff({ products: true, orders: true });
    expect(visibleNav(MAIN_NAV, viewer).map((i) => i.key)).toEqual(['home', 'orders', 'products']);
  });

  it('keeps Home, which has no permission gate at all', () => {
    expect(visibleNav(NAVIGATION, staff({})).map((i) => i.key)).toEqual(['home']);
  });

  it('filters subitems independently of their parent', () => {
    const products = visibleNav(NAVIGATION, staff({ products: true })).find(
      (i) => i.key === 'products',
    );
    expect(products?.subItems?.map((s) => s.label)).toEqual(['Collections', 'Inventory']);

    // Orders' Drafts subitem needs the orders permission, which this user lacks.
    const orders = visibleNav(NAVIGATION, staff({ orders: false, products: true })).find(
      (i) => i.key === 'orders',
    );
    expect(orders).toBeUndefined();

    // A permission explicitly set false is not held, same as absent.
    expect(visibleNav(NAVIGATION, staff({ products: false })).map((i) => i.key)).toEqual(['home']);
  });
});

describe('storeHref', () => {
  it('mounts a nav url under the shop, without a trailing slash', () => {
    expect(storeHref('demo', '/')).toBe('/store/demo');
    expect(storeHref('demo', '/products')).toBe('/store/demo/products');
    expect(storeHref('aurora-supply', '/orders/drafts')).toBe('/store/aurora-supply/orders/drafts');
  });
});

describe('isItemSelected', () => {
  const item = (key: string): NavItem => {
    const found = NAVIGATION.find((i) => i.key === key);
    if (!found) throw new Error(`No nav item "${key}" — the registry changed shape.`);
    return found;
  };

  it('selects Home only on the shop root', () => {
    expect(isItemSelected('/store/demo', 'demo', item('home'))).toBe(true);
    expect(isItemSelected('/store/demo/', 'demo', item('home'))).toBe(true);
    // Otherwise Home stays lit on every page, because its url is '/'.
    expect(isItemSelected('/store/demo/orders', 'demo', item('home'))).toBe(false);
  });

  it('selects a section on its own page and on its detail pages', () => {
    expect(isItemSelected('/store/demo/products', 'demo', item('products'))).toBe(true);
    expect(isItemSelected('/store/demo/products/prod_123', 'demo', item('products'))).toBe(true);
  });

  it('does not let a prefix match bleed into a sibling section', () => {
    // '/orders' must not select on '/orders-archive'.
    expect(isItemSelected('/store/demo/orders-archive', 'demo', item('orders'))).toBe(false);
  });

  it('keeps a section selected while a subitem page is open', () => {
    // Collections lives at /collections, not /products/collections, so the
    // parent has to match through its subitems or Products goes dark there.
    expect(isItemSelected('/store/demo/collections', 'demo', item('products'))).toBe(true);
    expect(isItemSelected('/store/demo/inventory', 'demo', item('products'))).toBe(true);
    expect(isItemSelected('/store/demo/orders/drafts', 'demo', item('orders'))).toBe(true);
  });

  it('scopes matching to the shop in the path', () => {
    expect(isItemSelected('/store/other/products', 'demo', item('products'))).toBe(false);
  });
});

describe('isSubItemSelected', () => {
  it('selects only the subitem whose page is open', () => {
    expect(isSubItemSelected('/store/demo/collections', 'demo', '/collections')).toBe(true);
    expect(isSubItemSelected('/store/demo/collections/col_1', 'demo', '/collections')).toBe(true);
    expect(isSubItemSelected('/store/demo/inventory', 'demo', '/collections')).toBe(false);
    // The parent's own page selects no subitem.
    expect(isSubItemSelected('/store/demo/products', 'demo', '/collections')).toBe(false);
  });
});
