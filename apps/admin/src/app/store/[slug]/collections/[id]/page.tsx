'use client';

/** `/store/{slug}/collections/{id}`. Owner: WS-B (B6). */
import type { Collection } from '@merchant/contracts/collections';
import { Banner, BlockStack, Page } from '@shopify/polaris';
import { CollectionIcon } from '@shopify/polaris-icons';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../../components/shell/page-header.tsx';
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
      <Page>
        <BlockStack gap="400">
          <PageHeader
            icon={CollectionIcon}
            title="Collection"
            parent={{ label: 'Collections', url: `/store/${slug}/collections` }}
          />
          <Banner tone="critical" title="This collection could not be loaded">
            <p>{collection.error?.message ?? 'It may have been deleted.'}</p>
          </Banner>
        </BlockStack>
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
