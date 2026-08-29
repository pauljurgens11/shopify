'use client';

/**
 * Quantity stepper + remove for one cart line. Owner: WS-E.
 * Passed to F1's `cart-page` section through `slots.cartLine`.
 *
 * Unlike the product page, this island cannot repaint the change on its own:
 * the line total and the cart subtotal are rendered by the theme's server
 * section, on either side of this slot. So a successful write reloads the cart
 * page and lets the server render the whole of it.
 *
 * The obvious alternatives are both the thing E8 turned out to be. A
 * `revalidatePath` in the action leaves the page unrepainted (measured 0/8
 * settled against 12/12 without it), and `router.refresh()` fails the same way
 * — it is the same streamed RSC update, and it moved the header badge on only
 * 3 of 8 runs. A navigation always lands.
 */
import type { CartLine } from '@merchant/contracts/cart';
import { useState } from 'react';
import { removeCartLine, updateCartLine } from '../lib/cart-actions.ts';

export function CartLineControls({ line }: { line: CartLine }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = (start: () => Promise<{ ok: boolean; message?: string }>, fallback: string) => {
    setError(null);
    setPending(true);
    start()
      .then((result) => {
        // Left pending on success: the reload replaces this page, and
        // re-enabling first would flash the control back to idle.
        if (result.ok) {
          window.location.reload();
          return;
        }
        setError(result.message ?? fallback);
        setPending(false);
      })
      .catch(() => {
        setError(fallback);
        setPending(false);
      });
  };

  const change = (quantity: number) => {
    if (pending) return;
    // Zero removes the line — E1 treats it that way, and it is what the
    // stepper sends when a shopper clicks past one.
    run(() => updateCartLine(line.id, quantity), 'We could not update your cart.');
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
            if (pending) return;
            run(() => removeCartLine(line.id), 'We could not update your cart.');
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
