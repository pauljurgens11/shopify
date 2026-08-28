'use client';

/**
 * Quantity stepper + remove for one cart line. Owner: WS-E.
 * Passed to F1's `cart-page` section through `slots.cartLine`.
 */
import type { CartLine } from '@merchant/contracts/cart';
import { useState, useTransition } from 'react';
import { removeCartLine, updateCartLine } from '../lib/cart-actions.ts';

export function CartLineControls({ line }: { line: CartLine }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (quantity: number) => {
    setError(null);
    startTransition(async () => {
      // Zero removes the line — E1 treats it that way, and it is what the
      // stepper sends when a shopper clicks past one.
      const result = await updateCartLine(line.id, quantity);
      if (!result.ok) setError(result.message ?? 'We could not update your cart.');
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-theme border border-text/25">
          <button
            type="button"
            aria-label={`Decrease quantity of ${line.title}`}
            className="px-3 py-1.5 leading-none disabled:opacity-40"
            disabled={pending}
            onClick={() => change(line.quantity - 1)}
          >
            −
          </button>
          <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity of ${line.title}`}
            className="px-3 py-1.5 leading-none disabled:opacity-40"
            disabled={pending || (line.available !== null && line.quantity >= line.available)}
            onClick={() => change(line.quantity + 1)}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="text-sm underline opacity-60 hover:opacity-100 disabled:opacity-40"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await removeCartLine(line.id);
              if (!result.ok) setError(result.message ?? 'We could not update your cart.');
            });
          }}
        >
          Remove
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
