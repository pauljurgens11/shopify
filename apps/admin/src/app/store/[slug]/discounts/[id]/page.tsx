'use client';

/**
 * Edit discount (C6). Same form as create; the draft is seeded from the row.
 */
import type { Discount } from '@merchant/contracts/discounts';
import { useParams } from 'next/navigation';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';
import { draftFromDiscount } from '../_components/discount-draft.ts';
import { DiscountForm } from '../_components/discount-form.tsx';

export default function EditDiscountPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const session = useSession();
  const discount = useApiQuery<Discount>(['discount', id], `/admin/api/discounts/${id}`);

  if (discount.isPending || !session.data || !discount.data) return <PageSkeleton />;

  return (
    <DiscountForm
      slug={slug}
      currencyCode={session.data.shop.currencyCode}
      initial={draftFromDiscount(discount.data, session.data.shop.currencyCode)}
      discountId={id}
    />
  );
}
