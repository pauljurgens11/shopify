/**
 * Where the preview iframe points (SPEC §12). Owner: WS-F.
 *
 * Always the REAL storefront origin (`{slug}.lvh.me:3002`), never a proxy: the
 * whole point of the preview is that the merchant sees what a visitor sees,
 * with the same cookies, the same cache and the same renderer.
 */
export const STOREFRONT_ORIGIN = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://lvh.me:3002';

export type PreviewPage = 'home' | 'product' | 'collection';

export type PreviewTarget = {
  shopSlug: string;
  page: PreviewPage;
  /** Signed, short-lived, version-scoped. Omit to show what shoppers see. */
  token?: string | null;
  productHandle?: string | null;
  collectionHandle?: string | null;
  /** Bumped to force the iframe to reload the same URL. */
  nonce?: number;
};

/** `{slug}.{origin-host}` — the origin is a bare domain, the shop is a subdomain. */
export function storefrontOrigin(shopSlug: string, origin: string = STOREFRONT_ORIGIN): string {
  const [protocol, host] = origin.split('://');
  return `${protocol ?? 'http'}://${shopSlug}.${host ?? 'lvh.me:3002'}`;
}

function pathFor(target: PreviewTarget): string {
  if (target.page === 'product') {
    return target.productHandle ? `/products/${target.productHandle}` : '/';
  }
  if (target.page === 'collection') {
    return target.collectionHandle ? `/collections/${target.collectionHandle}` : '/';
  }
  return '/';
}

export function previewUrl(target: PreviewTarget, origin: string = STOREFRONT_ORIGIN): string {
  const url = new URL(pathFor(target), storefrontOrigin(target.shopSlug, origin));
  if (target.token) url.searchParams.set('preview', target.token);
  // An iframe will not re-request an identical src, so a refresh needs a change.
  if (target.nonce) url.searchParams.set('_r', String(target.nonce));
  return url.toString();
}
