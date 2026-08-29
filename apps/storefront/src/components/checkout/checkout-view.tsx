'use client';

/**
 * The checkout screen (SPEC §10, PARITY.md "Checkout (E4)"). Owner: WS-E.
 *
 * Shopify's single-page checkout: sections stack in one column, each saving as
 * the shopper leaves it, with the summary sidebar repricing on every save. The
 * layout order is PARITY's and is not negotiable — express row, Contact,
 * Delivery, shipping methods, Payment, Pay now.
 *
 * State lives here and totals never do: every number rendered comes from the
 * `Checkout` E3 last returned, so the sidebar cannot disagree with the charge.
 *
 * The card is the one thing this component does not hold — `CardFields` keeps
 * it and hands back a vault token (SPEC §11).
 */
import { format } from '@merchant/config/money';
import type { Checkout } from '@merchant/contracts/checkout';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { payForCheckout, updateCheckout } from '../../lib/checkout-actions.ts';
import { randomId } from '../../lib/random-id.ts';
import { CardFields, type CardFieldsHandle } from './card-fields.tsx';
import { OrderSummary } from './order-summary.tsx';

const money = (amount: number, currency: string) => format({ amount, currencyCode: currency });

interface AddressFields {
  countryCode: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  provinceCode: string;
  zip: string;
}

const EMPTY_ADDRESS: AddressFields = {
  countryCode: 'US',
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  provinceCode: '',
  zip: '',
};

/** Enough of an address for E3 to price shipping and for the order to ship. */
const addressComplete = (a: AddressFields) =>
  Boolean(a.firstName && a.lastName && a.address1 && a.city && a.zip && a.countryCode);

export function CheckoutView({
  initial,
  shopName,
  accountEmail,
  tokenizeUrl,
}: {
  initial: Checkout;
  shopName: string;
  /** The signed-in shopper's email, or null for a guest. Gates "save this card". */
  accountEmail: string | null;
  tokenizeUrl: string;
}) {
  const router = useRouter();
  const card = useRef<CardFieldsHandle>(null);
  const initialAddress = useMemo<AddressFields>(
    () => ({
      ...EMPTY_ADDRESS,
      ...(initial.shippingAddress
        ? {
            countryCode: initial.shippingAddress.countryCode ?? 'US',
            firstName: initial.shippingAddress.firstName ?? '',
            lastName: initial.shippingAddress.lastName ?? '',
            address1: initial.shippingAddress.address1 ?? '',
            address2: initial.shippingAddress.address2 ?? '',
            city: initial.shippingAddress.city ?? '',
            provinceCode: initial.shippingAddress.provinceCode ?? '',
            zip: initial.shippingAddress.zip ?? '',
          }
        : {}),
    }),
    [initial.shippingAddress],
  );

  const [checkout, setCheckout] = useState(initial);
  const [email, setEmail] = useState(initial.email ?? '');
  const [marketing, setMarketing] = useState(initial.acceptsMarketing);
  const [address, setAddress] = useState<AddressFields>(initialAddress);
  const [saveCard, setSaveCard] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [paying, setPaying] = useState(false);

  /**
   * The rate the shopper just clicked, while its save is still in flight.
   *
   * Radios are otherwise driven purely by server state, so between the click
   * and the response every radio renders empty — which a shopper reads as the
   * checkout having discarded their choice. Only the selection is optimistic:
   * the sidebar's money stays server-computed, so it can never disagree with
   * what the card is charged (totals.ts).
   */
  const [pendingRateId, setPendingRateId] = useState<string | null>(null);
  const selectedRateId = pendingRateId ?? checkout.selectedShippingRateId;

  /** The address as last sent, so an unchanged field's blur sends nothing. */
  const savedAddress = useRef(
    addressComplete(initialAddress) ? JSON.stringify(initialAddress) : '',
  );

  const save = (patch: Record<string, unknown>, onSettled?: (ok: boolean) => void) =>
    startSaving(async () => {
      const result = await updateCheckout(checkout.token, patch);
      if (result.ok && result.checkout) setCheckout(result.checkout);
      else if (result.message) setBanner(result.message);
      onSettled?.(result.ok);
    });

  const saveAddress = (next: AddressFields) => {
    setAddress(next);
    // Only once it is a real address — E3 prices shipping from it, and a
    // half-typed one would flap the rate list under the shopper's cursor.
    if (!addressComplete(next)) return;
    // Every field's blur lands here, changed or not. Re-sending an identical
    // address costs a full reprice each time, and Next runs Server Actions one
    // at a time — so those redundant saves queue ahead of the shopper's next
    // real action (picking a rate, applying a code) and stall the UI behind it.
    const unchanged = JSON.stringify(next);
    if (unchanged === savedAddress.current) return;
    savedAddress.current = unchanged;

    save(
      {
        shippingAddress: {
          firstName: next.firstName,
          lastName: next.lastName,
          address1: next.address1,
          address2: next.address2 || null,
          city: next.city,
          province: next.provinceCode || null,
          provinceCode: next.provinceCode || null,
          country: next.countryCode === 'US' ? 'United States' : next.countryCode,
          countryCode: next.countryCode,
          zip: next.zip,
        },
      },
      // A save that failed was never persisted, so the next blur must retry it.
      (ok) => {
        if (!ok) savedAddress.current = '';
      },
    );
  };

  const canPay =
    Boolean(email) && addressComplete(address) && Boolean(checkout.selectedShippingRateId);

  // Only offered to a signed-in shopper paying under their own address — the
  // API saves for nobody else, and a checkbox that quietly does nothing is
  // worse than no checkbox. Retyping the email to someone else's withdraws it.
  const canSaveCard =
    accountEmail !== null && email.trim().toLowerCase() === accountEmail.toLowerCase();

  const pay = async () => {
    setBanner(null);
    setPaying(true);
    try {
      const cardTokenId = await card.current?.tokenize();
      // Field-level errors are already rendered inside CardFields.
      if (!cardTokenId) return;

      // One key per click: a double-submit charges once, and a retry after a
      // decline is a new attempt that must reach the processor (E3).
      const idempotencyKey = `pay_${randomId()}`;
      const result = await payForCheckout(
        checkout.token,
        cardTokenId,
        idempotencyKey,
        canSaveCard && saveCard,
      );

      if (result.outcome === 'success') {
        router.push(`/checkouts/${checkout.token}/thank-you`);
        return;
      }
      setBanner(result.message ?? 'We could not complete your order.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <div className="order-2 px-6 py-8 lg:order-1 lg:px-10 lg:py-12">
        <header className="mb-8">
          <h1 className="font-medium text-2xl tracking-tight">{shopName}</h1>
        </header>

        {/* Express checkout is a placeholder row: SPEC §2 rules out wallets. */}
        <section aria-label="Express checkout" className="mb-8">
          <div className="flex h-11 items-center justify-center rounded border border-neutral-200 border-dashed bg-neutral-50 text-neutral-400 text-sm">
            Express checkout unavailable
          </div>
          <div className="my-6 flex items-center gap-4 text-neutral-400 text-xs">
            <span className="h-px flex-1 bg-neutral-200" />
            OR
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
        </section>

        <Section title="Contact">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onBlur={() => email && email !== checkout.email && save({ email })}
          />
          <label className="mt-3 flex items-center gap-2 text-neutral-600 text-sm">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => {
                setMarketing(event.target.checked);
                save({ acceptsMarketing: event.target.checked });
              }}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Email me with news and offers
          </label>
        </Section>

        <Section title="Delivery">
          <Select
            label="Country/Region"
            value={address.countryCode}
            onChange={(countryCode) => saveAddress({ ...address, countryCode })}
            options={[
              ['US', 'United States'],
              ['CA', 'Canada'],
              ['GB', 'United Kingdom'],
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              autoComplete="given-name"
              value={address.firstName}
              onChange={(firstName) => setAddress({ ...address, firstName })}
              onBlur={() => saveAddress(address)}
            />
            <Input
              label="Last name"
              autoComplete="family-name"
              value={address.lastName}
              onChange={(lastName) => setAddress({ ...address, lastName })}
              onBlur={() => saveAddress(address)}
            />
          </div>
          <Input
            label="Address"
            autoComplete="address-line1"
            value={address.address1}
            onChange={(address1) => setAddress({ ...address, address1 })}
            onBlur={() => saveAddress(address)}
          />
          <Input
            label="Apartment, suite, etc. (optional)"
            autoComplete="address-line2"
            value={address.address2}
            onChange={(address2) => setAddress({ ...address, address2 })}
            onBlur={() => saveAddress(address)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              autoComplete="address-level2"
              value={address.city}
              onChange={(city) => setAddress({ ...address, city })}
              onBlur={() => saveAddress(address)}
            />
            <Input
              label="State"
              autoComplete="address-level1"
              value={address.provinceCode}
              onChange={(provinceCode) => setAddress({ ...address, provinceCode })}
              onBlur={() => saveAddress(address)}
            />
            <Input
              label="ZIP code"
              autoComplete="postal-code"
              value={address.zip}
              onChange={(zip) => setAddress({ ...address, zip })}
              onBlur={() => saveAddress(address)}
            />
          </div>
        </Section>

        <Section title="Shipping method">
          {/* Shopify withholds the rate list until it has somewhere to ship to,
              even though E3 can price rates from the subtotal alone (PARITY). */}
          {!addressComplete(address) || checkout.shippingOptions.length === 0 ? (
            <p className="rounded border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-neutral-500 text-sm">
              Enter your shipping address to see available rates.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-300">
              {checkout.shippingOptions.map((option, index) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm ${
                    index > 0 ? 'border-neutral-300 border-t' : ''
                  } ${selectedRateId === option.id ? 'bg-neutral-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="shipping-rate"
                    checked={selectedRateId === option.id}
                    onChange={() => {
                      setPendingRateId(option.id);
                      // Handing back to server state on settle is what keeps a
                      // rate the discount just disqualified dropping out of the
                      // list (totals.ts). A newer click owns the pending slot,
                      // so an older save settling must not clear it.
                      save({ selectedShippingRateId: option.id }, () =>
                        setPendingRateId((pending) => (pending === option.id ? null : pending)),
                      );
                    }}
                    className="h-4 w-4"
                  />
                  <span className="flex-1">{option.title}</span>
                  <span className="tabular-nums">
                    {option.price.amount === 0
                      ? 'Free'
                      : money(option.price.amount, checkout.currencyCode)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section title="Payment">
          <p className="-mt-1 mb-3 text-neutral-500 text-sm">
            All transactions are secure and encrypted.
          </p>
          {banner ? (
            <div
              role="alert"
              className="mb-3 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700 text-sm"
            >
              {banner}
            </div>
          ) : null}
          <CardFields ref={card} tokenizeUrl={tokenizeUrl} />
          {canSaveCard ? (
            <label className="mt-3 flex items-center gap-2 text-neutral-600 text-sm">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(event) => setSaveCard(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              Save this card for future purchases
            </label>
          ) : null}
          <label className="mt-3 flex items-center gap-2 text-neutral-600 text-sm">
            <input type="radio" checked readOnly className="h-4 w-4" />
            Billing address same as shipping address
          </label>
        </Section>

        <button
          type="button"
          onClick={pay}
          disabled={!canPay || paying || saving}
          className="mt-6 w-full rounded bg-neutral-900 py-4 font-medium text-base text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {paying ? 'Processing…' : 'Pay now'}
        </button>
      </div>

      <div className="order-1 lg:order-2">
        <OrderSummary
          checkout={checkout}
          busy={saving}
          onApplyDiscount={(code) => save({ discountCode: code || null })}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 font-medium text-lg">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={label}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="w-full rounded border border-neutral-300 px-3.5 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-neutral-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-neutral-900"
      >
        {options.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
