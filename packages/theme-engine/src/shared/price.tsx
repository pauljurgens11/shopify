import { format } from '@merchant/config/money';
import type { MoneyDto } from '@merchant/contracts/common';
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { cx } from './section-shell.tsx';

/**
 * Money is integer minor units everywhere (CLAUDE.md §5); formatting happens
 * here, at the render layer, and nowhere else.
 * Owner: WS-F.
 */
export function formatMoney(value: MoneyDto): string {
  return format(value);
}

/**
 * The compare-at price shown next to `product.priceRange.min` — taken from the
 * cheapest variant, and only when it is genuinely higher than what we charge.
 */
export function compareAtFor(product: StorefrontProduct): MoneyDto | null {
  const cheapest = product.variants.reduce<StorefrontProduct['variants'][number] | null>(
    (best, variant) => (best === null || variant.price.amount < best.price.amount ? variant : best),
    null,
  );
  const compareAt = cheapest?.compareAtPrice ?? null;
  if (!compareAt || !cheapest) return null;
  return compareAt.amount > cheapest.price.amount ? compareAt : null;
}

export function Price({
  price,
  compareAt = null,
  fromPrefix = false,
  className,
}: {
  price: MoneyDto;
  compareAt?: MoneyDto | null;
  /** Show "From $x" for a product whose variants span a range. */
  fromPrefix?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex items-baseline gap-2', className)}>
      <span className="text-text">
        {fromPrefix ? 'From ' : null}
        {formatMoney(price)}
      </span>
      {compareAt ? <s className="text-text/50 text-[0.9em]">{formatMoney(compareAt)}</s> : null}
    </span>
  );
}
