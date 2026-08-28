'use client';

/**
 * Hosted-fields-style card entry (SPEC §11, CLAUDE.md §9). Owner: WS-E.
 *
 * **The card never leaves this component except to the vault.** The values live
 * in local state, are posted straight to `{API}/vault/tokenize` cross-origin,
 * and what comes back — `card_tok_…` — is the only thing the rest of the app
 * ever sees. No card field is put in a checkout PUT, an analytics beacon, a log
 * line, or a form action.
 *
 * `tokenize()` is exposed through a ref so the parent can trigger it on "Pay
 * now" without ever holding the values itself.
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import {
  cardBrandOf,
  cvcLength,
  formatCardNumber,
  formatExpiry,
  parseExpiry,
} from '../../lib/card.ts';

export interface CardFieldsHandle {
  /** Vault the card and return its token, or null once errors are displayed. */
  tokenize: () => Promise<string | null>;
}

interface FieldErrors {
  number?: string;
  expiry?: string;
  cvc?: string;
  name?: string;
}

const BRAND_LABEL: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'MC',
  amex: 'AMEX',
  discover: 'DISC',
};

export const CardFields = forwardRef<CardFieldsHandle, { tokenizeUrl: string }>(function CardFields(
  { tokenizeUrl },
  ref,
) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const brand = cardBrandOf(number);

  useImperativeHandle(ref, () => ({
    async tokenize() {
      const next: FieldErrors = {};
      const parsedExpiry = parseExpiry(expiry);
      const digits = number.replace(/\D/g, '');

      // Shape checks only, so the shopper gets an inline error without a round
      // trip. The vault is what actually validates (Luhn, brand, expiry).
      if (digits.length < 12) next.number = 'Enter a valid card number.';
      if (!parsedExpiry) next.expiry = 'Enter a valid expiration date.';
      if (cvc.length < cvcLength(brand)) next.cvc = 'Enter the security code.';
      if (name.trim().length === 0) next.name = 'Enter the name on your card.';

      setErrors(next);
      if (Object.keys(next).length > 0 || !parsedExpiry) return null;

      try {
        const response = await fetch(tokenizeUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Cross-origin to the API on purpose: this request, and only this
          // request, carries the number. The vault resolves the shop from the
          // Origin header this send sets.
          body: JSON.stringify({
            number: digits,
            expMonth: parsedExpiry.expMonth,
            expYear: parsedExpiry.expYear,
            cvc,
            cardholderName: name.trim(),
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            errors?: Array<{ message?: string; field?: string }>;
          } | null;
          const error = body?.errors?.[0];
          const field = error?.field;
          setErrors({
            [field === 'expMonth' || field === 'expYear' ? 'expiry' : (field ?? 'number')]:
              error?.message ?? 'We could not accept that card.',
          });
          return null;
        }

        const token = (await response.json()) as { cardTokenId: string };
        return token.cardTokenId;
      } catch {
        setErrors({ number: 'We could not reach the card service. Try again.' });
        return null;
      }
    },
  }));

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-300">
      <Field
        label="Card number"
        error={errors.number}
        input={
          <div className="flex items-center">
            <input
              value={number}
              onChange={(event) => setNumber(formatCardNumber(event.target.value))}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="Card number"
              aria-label="Card number"
              aria-invalid={Boolean(errors.number)}
              className="w-full bg-transparent outline-none placeholder:text-neutral-400"
            />
            {BRAND_LABEL[brand] ? (
              <span className="ml-2 shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-semibold text-[10px] text-neutral-600 tracking-wide">
                {BRAND_LABEL[brand]}
              </span>
            ) : null}
          </div>
        }
      />
      <div className="grid grid-cols-2 border-neutral-300 border-t">
        <Field
          label="Expiration date (MM / YY)"
          error={errors.expiry}
          className="border-neutral-300 border-r"
          input={
            <input
              value={expiry}
              onChange={(event) => setExpiry(formatExpiry(event.target.value))}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              aria-label="Expiration date"
              aria-invalid={Boolean(errors.expiry)}
              className="w-full bg-transparent outline-none placeholder:text-neutral-400"
            />
          }
        />
        <Field
          label="Security code"
          error={errors.cvc}
          input={
            <input
              value={cvc}
              onChange={(event) =>
                setCvc(event.target.value.replace(/\D/g, '').slice(0, cvcLength(brand)))
              }
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="Security code"
              aria-label="Security code"
              aria-invalid={Boolean(errors.cvc)}
              className="w-full bg-transparent outline-none placeholder:text-neutral-400"
            />
          }
        />
      </div>
      <Field
        label="Name on card"
        error={errors.name}
        className="border-neutral-300 border-t"
        input={
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="cc-name"
            placeholder="Name on card"
            aria-label="Name on card"
            aria-invalid={Boolean(errors.name)}
            className="w-full bg-transparent outline-none placeholder:text-neutral-400"
          />
        }
      />
    </div>
  );
});

function Field({
  label,
  input,
  error,
  className,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={`px-3.5 py-3 text-sm ${error ? 'bg-red-50' : ''}`}>
        <span className="sr-only">{label}</span>
        {input}
      </div>
      {error ? (
        <p role="alert" className="px-3.5 pb-2 text-red-600 text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
