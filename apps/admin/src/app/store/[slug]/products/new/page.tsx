'use client';

/**
 * `/store/{slug}/products/new`. Owner: WS-B (B5).
 *
 * The same form as the edit page with nothing loaded into it; on save it
 * redirects to the created product, the way Shopify does.
 */
import { useParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useSession } from '../../../../../lib/session.ts';
import { ProductForm } from '../_components/product-form.tsx';

export default function NewProductPage() {
  const { slug } = useParams<{ slug: string }>();
  // The shop's currency decides what the price fields mean, so the form waits
  // for it rather than guessing USD and mislabelling every input.
  const session = useSession();

  if (session.isPending || !session.data) return <PageSkeleton />;

  return <ProductForm slug={slug} currencyCode={session.data.shop.currencyCode} />;
}
