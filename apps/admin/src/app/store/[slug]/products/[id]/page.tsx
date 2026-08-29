'use client';

import type { Product } from '@merchant/contracts/products';
/**
 * `/store/{slug}/products/{id}`. Owner: WS-B (B5).
 *
 * A product the tenant does not own is a 404 from the API, and it renders as
 * one here rather than as an empty form the merchant could type into.
 */
import { Banner, Page } from '@shopify/polaris';
import { useParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';
import { ProductForm } from '../_components/product-form.tsx';

export default function EditProductPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const session = useSession();
  const product = useApiQuery<Product>(['product', id], `/admin/api/products/${id}`);

  if (product.isPending || session.isPending) return <PageSkeleton layout="detail" />;

  if (product.error || !product.data || !session.data) {
    return (
      <Page backAction={{ content: 'Products', url: `/store/${slug}/products` }} title="Product">
        <Banner tone="critical" title="This product could not be loaded">
          <p>{product.error?.message ?? 'It may have been deleted.'}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <ProductForm
      slug={slug}
      // Remounts when the id changes, so the draft never carries one product's
      // unsaved edits onto another.
      key={product.data.id}
      product={product.data}
      currencyCode={session.data.shop.currencyCode}
    />
  );
}
