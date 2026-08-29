import { BRAND_NAME } from '@merchant/config/constants';
import type { Metadata } from 'next';
import { AdminFrame } from '../../../components/shell/admin-frame.tsx';

/**
 * Every page under `/store/{slug}` renders inside the admin shell (SPEC §6, §9).
 * Owner: WS-A — leaf issues add pages under this, not around it.
 *
 * A SERVER component so it can carry `metadata`: this is Home's title, and each
 * section directory overrides it with its own (H3). It used to be `'use client'`
 * for `useParams`; a server layout is handed `params` directly, so nothing is
 * lost and the shell below is still a client component.
 */
// `template` is repeated here on purpose. A segment whose `title` is a plain
// string clears the inherited template for everything below it, so without this
// the section layouts render a bare "Products" instead of "Products · Shopify".
// `default` names Home itself and is still run through the ROOT template, so it
// is "Home" here rather than "Home · Shopify" — otherwise the suffix lands twice.
export const metadata: Metadata = {
  title: { default: 'Home', template: `%s · ${BRAND_NAME}` },
};

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AdminFrame shopSlug={slug}>{children}</AdminFrame>;
}
