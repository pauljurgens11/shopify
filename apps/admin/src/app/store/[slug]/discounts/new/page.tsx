'use client';

/**
 * New discount (C6). The type comes from the index's split menu as `?type=`,
 * because it decides which controls the form shows at all.
 */
import type { Discount } from '@merchant/contracts/discounts';
import { useParams, useSearchParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useSession } from '../../../../../lib/session.ts';
import { emptyDraft } from '../_components/discount-draft.ts';
import { DiscountForm } from '../_components/discount-form.tsx';

const TYPES: Discount['type'][] = ['amount_off_order', 'amount_off_products', 'free_shipping'];

export default function NewDiscountPage() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const session = useSession();

  const requested = params.get('type') as Discount['type'] | null;
  const type = requested && TYPES.includes(requested) ? requested : 'amount_off_order';

  if (!session.data) return <PageSkeleton />;

  return (
    <DiscountForm
      slug={slug}
      currencyCode={session.data.shop.currencyCode}
      initial={emptyDraft(type)}
    />
  );
}
