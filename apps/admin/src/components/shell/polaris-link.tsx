'use client';

/**
 * Teaches Polaris to navigate with Next's router (SPEC §9). Owner: WS-A.
 *
 * Polaris renders a plain `<a href>` for anything with a `url` — nav items,
 * `Link`, `Button url=…`. Left alone, every click on the left nav is a full
 * document load: a white flash and a fresh React tree on each section change.
 * Shopify's admin is a single-page app, so that alone loses the KPI.
 *
 * `AppProvider linkComponent` is Polaris's own hook for this, so every link in
 * every workstream's pages gets client-side navigation without those pages
 * doing anything.
 */
import NextLink from 'next/link';

/**
 * Polaris does not re-export `LinkLikeComponent` from the package root, and its
 * build-internal path is not a public entry point. Declaring the shape here
 * keeps the contract without importing through Polaris's build layout;
 * assignability is still checked where AppProvider consumes it.
 */
type PolarisLinkProps = React.HTMLProps<HTMLAnchorElement> & {
  url: string;
  external?: boolean;
  children?: React.ReactNode;
};

const isExternal = (url: string) => /^(https?:)?\/\//.test(url) || url.startsWith('mailto:');

export function PolarisLink({ url, external, children, ...rest }: PolarisLinkProps) {
  if (external || isExternal(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <NextLink href={url} {...rest}>
      {children}
    </NextLink>
  );
}
