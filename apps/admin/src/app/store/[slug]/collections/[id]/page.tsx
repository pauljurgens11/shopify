'use client';

/** `/store/{slug}/collections/{id}`. Owner: WS-B (B6). */
import type { Collection } from '@merchant/contracts/collections';
import { Banner, Page } from '@shopify/polaris';
import { useParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';
import { CollectionForm } from '../_components/collection-form.tsx';

export default function EditCollectionPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const session = useSession();
  const collection = useApiQuery<Collection>(['collection', id], `/admin/api/collections/${id}`);

  if (collection.isPending || session.isPending) return <PageSkeleton layout="detail" />;

  if (collection.error || !collection.data || !session.data) {
    return (
      <Page
        backAction={{ content: 'Collections', url: `/store/${slug}/collections` }}
        title="Collection"
      >
        <Banner tone="critical" title="This collection could not be loaded">
          <p>{collection.error?.message ?? 'It may have been deleted.'}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <CollectionForm
      slug={slug}
      // Remounts on id change, so one collection's unsaved edits never carry
      // onto another.
      key={collection.data.id}
      collection={collection.data}
      currencyCode={session.data.shop.currencyCode}
    />
  );
}
