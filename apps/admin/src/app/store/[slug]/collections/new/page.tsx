'use client';

/** `/store/{slug}/collections/new`. Owner: WS-B (B6). */
import { useParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useSession } from '../../../../../lib/session.ts';
import { CollectionForm } from '../_components/collection-form.tsx';

export default function NewCollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  // A price condition is typed in the shop's currency, so the builder waits
  // for it rather than labelling every field with a guessed "$".
  const session = useSession();

  if (session.isPending || !session.data) return <PageSkeleton />;

  return <CollectionForm slug={slug} currencyCode={session.data.shop.currencyCode} />;
}
