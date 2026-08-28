'use client';

/**
 * Variant picker + quantity + add to cart (SPEC §10). Owner: WS-E.
 *
 * One of the three client leaves on the storefront. F1's `product-detail`
 * section is a Server Component and takes this through `slots.productForm`, so
 * everything around it stays server-rendered.
 *
 * Selection is by option values rather than by variant id: that is what lets
 * "Size M" stay chosen when the shopper switches colour, which is how every
 * Shopify product page behaves.
 */
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { useMemo, useState, useTransition } from 'react';
import { addToCart } from '../lib/cart-actions.ts';

type Variant = StorefrontProduct['variants'][number];

function sameOptions(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(b);
  return keys.length > 0 && keys.every((key) => a[key] === b[key]);
}

export function ProductForm({ product }: { product: StorefrontProduct }) {
  const firstAvailable =
    product.variants.find((variant) => variant.available) ?? product.variants[0];
  const [selection, setSelection] = useState<Record<string, string>>(
    firstAvailable?.optionValues ?? {},
  );
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected: Variant | undefined = useMemo(
    () =>
      product.variants.find((variant) => sameOptions(variant.optionValues, selection)) ??
      (product.options.length === 0 ? product.variants[0] : undefined),
    [product, selection],
  );

  const submit = () => {
    if (!selected) return;
    setError(null);
    setAdded(false);
    startTransition(async () => {
      const result = await addToCart(selected.id, quantity);
      if (result.ok) setAdded(true);
      else setError(result.message ?? 'We could not add that to your cart.');
    });
  };

  const soldOut = selected ? !selected.available : true;

  return (
    <div className="mt-6 flex flex-col gap-5">
      {product.options.map((option) => (
        <fieldset key={option.name} className="flex flex-col gap-2">
          <legend className="text-sm font-medium opacity-70">{option.name}</legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selection[option.name] === value;
              // Greyed rather than hidden: a shopper needs to see that the
              // combination exists and is gone, not that it never existed.
              const reachable = product.variants.some(
                (variant) => variant.optionValues[option.name] === value && variant.available,
              );
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelection((current) => ({ ...current, [option.name]: value }))}
                  aria-pressed={active}
                  className={`rounded-theme border px-4 py-2 text-sm transition-colors ${
                    active
                      ? 'border-primary bg-primary text-background'
                      : 'border-text/25 hover:border-text/60'
                  } ${reachable ? '' : 'opacity-40'}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-theme border border-text/25">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-3 py-2 text-lg leading-none disabled:opacity-40"
            disabled={quantity <= 1}
            onClick={() => setQuantity((n) => Math.max(1, n - 1))}
          >
            −
          </button>
          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-3 py-2 text-lg leading-none"
            onClick={() => setQuantity((n) => Math.min(999, n + 1))}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending || soldOut || !selected}
          className="flex-1 rounded-theme bg-[var(--theme-button-bg)] px-6 py-3 text-sm font-medium text-[var(--theme-button-fg)] ring-1 ring-[var(--theme-button-border)] transition-colors hover:bg-[var(--theme-button-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {soldOut ? 'Sold out' : pending ? 'Adding…' : 'Add to cart'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {added && !error ? (
        <p className="text-sm opacity-70">
          Added to your cart.{' '}
          <a className="underline" href="/cart">
            View cart
          </a>
        </p>
      ) : null}
    </div>
  );
}
