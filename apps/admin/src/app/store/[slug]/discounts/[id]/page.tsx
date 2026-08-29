'use client';

/**
 * Edit discount (C6). Same form as create; the draft is seeded from the row.
 */
import type { Discount } from '@merchant/contracts/discounts';
import { Banner, BlockStack, Page } from '@shopify/polaris';
import { DiscountIcon } from '@shopify/polaris-icons';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../../components/shell/page-header.tsx';
import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
import { useApiQuery } from '../../../../../lib/api.ts';
import { useSession } from '../../../../../lib/session.ts';
import { draftFromDiscount } from '../_components/discount-draft.ts';
import { DiscountForm } from '../_components/discount-form.tsx';

export default function EditDiscountPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const session = useSession();
  const discount = useApiQuery<Discount>(['discount', id], `/admin/api/discounts/${id}`);

  if (discount.isPending || session.isPending) return <PageSkeleton layout="detail" />;

  // A deleted or mistyped id must not sit on a skeleton forever (B5's pattern).
  if (discount.error || !discount.data || !session.data) {
    return (
      <Page>
        <BlockStack gap="400">
          <PageHeader
            icon={DiscountIcon}
            title="Discount"
            parent={{ label: 'Discounts', url: `/store/${slug}/discounts` }}
          />
          <Banner tone="critical" title="This discount could not be loaded">
            <p>{discount.error?.message ?? 'It may have been deleted.'}</p>
          </Banner>
        </BlockStack>
      </Page>
    );
  }

  return (
    <DiscountForm
      slug={slug}
      currencyCode={session.data.shop.currencyCode}
      initial={draftFromDiscount(discount.data, session.data.shop.currencyCode)}
      discountId={id}
    />
  );
}
