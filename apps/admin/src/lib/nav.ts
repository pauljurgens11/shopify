/**
 * Navigation visibility and selection (SPEC §8, §9). Owner: WS-A.
 *
 * Pure on purpose: the shell component below this is thin JSX, and the rules
 * that are actually easy to get wrong live here where they can be tested.
 * The item list itself comes from `src/navigation/` — do not read it directly,
 * and do not edit it (CLAUDE.md §3).
 */
import type { PermissionArea, StaffRole } from '@merchant/config/constants';
import type { Permissions } from '@merchant/contracts/auth';
import type { NavItem } from '../navigation/index.ts';

/** Just enough of the session to decide what this person may see. */
export type Viewer = { role: StaffRole; permissions: Permissions };

/** Mirrors the API's requirePermission: owner and admin bypass the map. */
export function canSee(viewer: Viewer, permission?: PermissionArea): boolean {
  if (!permission) return true;
  if (viewer.role === 'owner' || viewer.role === 'admin') return true;
  return viewer.permissions[permission] === true;
}

/**
 * Shopify hides nav items a staff user cannot open, rather than showing them
 * and refusing on click (SPEC §9).
 */
export function visibleNav(items: NavItem[], viewer: Viewer): NavItem[] {
  return items
    .filter((item) => canSee(viewer, item.permission))
    .map((item) =>
      item.subItems
        ? { ...item, subItems: item.subItems.filter((sub) => canSee(viewer, sub.permission)) }
        : item,
    );
}

/** `('demo', '/products')` → `/store/demo/products`; `'/'` → `/store/demo`. */
export function storeHref(shopSlug: string, url: string): string {
  const suffix = url === '/' ? '' : url;
  return `/store/${shopSlug}${suffix}`;
}

/**
 * True when `pathname` is `href` or a page below it.
 *
 * The segment check is what stops `/orders` from selecting on
 * `/orders-archive` — a plain `startsWith` lights up the wrong nav item.
 */
function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Section selection. A section stays selected while one of its subitems is
 * open, because Shopify's subitems live at sibling URLs (`/collections`, not
 * `/products/collections`) and the parent would otherwise go dark.
 */
export function isItemSelected(pathname: string, shopSlug: string, item: NavItem): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  const home = storeHref(shopSlug, '/');

  // Home's url is '/', which is under every other page — so it is exact-match only.
  if (item.url === '/') return path === home;

  if (isUnder(path, storeHref(shopSlug, item.url))) return true;
  return (item.subItems ?? []).some((sub) => isUnder(path, storeHref(shopSlug, sub.url)));
}

export function isSubItemSelected(pathname: string, shopSlug: string, url: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  return isUnder(path, storeHref(shopSlug, url));
}
