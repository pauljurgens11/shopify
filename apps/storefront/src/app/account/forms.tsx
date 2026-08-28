'use client';

/**
 * Client islands for the account pages. Owner: WS-E (E5).
 *
 * Styled with the same theme-token classes as F1's sections (`rounded-theme`,
 * `border-text/20`, `outline-accent`) so the account surface inherits every
 * shop's branding like any other storefront page.
 */
import type { StorefrontCustomer } from '@merchant/contracts/customers';
import { ThemeButton } from '@merchant/theme-engine/shared';
import { useActionState, useEffect, useTransition } from 'react';
import {
  type AccountActionResult,
  loginAction,
  logoutAction,
  registerAction,
  updateProfileAction,
} from './actions.ts';

const INPUT_CLASS =
  'w-full rounded-theme border border-text/20 bg-transparent px-3 py-2 text-sm text-text ' +
  'placeholder:text-text/40 focus-visible:outline-2 focus-visible:outline-accent ' +
  'focus-visible:outline-offset-2';

function Field({
  label,
  name,
  type = 'text',
  required = false,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string | null;
}) {
  const id = `account-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-text/70">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue ?? undefined}
        className={INPUT_CLASS}
      />
    </div>
  );
}

function FormError({ result }: { result: AccountActionResult | null }) {
  if (!result || result.ok || !result.message) return null;
  return (
    <p role="alert" className="rounded-theme border border-text/15 bg-text/5 px-3 py-2 text-sm">
      {result.message}
    </p>
  );
}

/**
 * Success is a FULL navigation, not a router transition: the session cookie
 * just changed, and a hard load re-renders header + page against it without
 * asking the app router to refresh a tree mid-action (see actions.ts).
 */
function useAuthRedirect(result: AccountActionResult | null) {
  useEffect(() => {
    if (result?.ok) window.location.assign('/account');
  }, [result]);
}

export function LoginForm() {
  const [result, action, pending] = useActionState(loginAction, null);
  useAuthRedirect(result);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError result={result} />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <fieldset disabled={pending} className="contents">
        <ThemeButton type="submit" size="lg" block>
          {pending || result?.ok ? 'Signing in…' : 'Sign in'}
        </ThemeButton>
      </fieldset>
    </form>
  );
}

export function RegisterForm() {
  const [result, action, pending] = useActionState(registerAction, null);
  useAuthRedirect(result);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError result={result} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="firstName" autoComplete="given-name" />
        <Field label="Last name" name="lastName" autoComplete="family-name" />
      </div>
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
      <fieldset disabled={pending} className="contents">
        <ThemeButton type="submit" size="lg" block>
          {pending || result?.ok ? 'Creating account…' : 'Create account'}
        </ThemeButton>
      </fieldset>
    </form>
  );
}

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm underline opacity-60 hover:opacity-100 disabled:opacity-40"
      onClick={() =>
        startTransition(async () => {
          await logoutAction();
          window.location.assign('/');
        })
      }
    >
      Sign out
    </button>
  );
}

/** Name + default address — the account page's one edit form (SPEC §8). */
export function ProfileForm({ customer }: { customer: StorefrontCustomer }) {
  const [result, action, pending] = useActionState(updateProfileAction, null);
  const address = customer.defaultAddress;
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError result={result} />
      {result?.ok ? (
        <p
          role="status"
          className="rounded-theme border border-text/15 bg-text/5 px-3 py-2 text-sm"
        >
          Saved.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          name="firstName"
          autoComplete="given-name"
          defaultValue={customer.firstName}
        />
        <Field
          label="Last name"
          name="lastName"
          autoComplete="family-name"
          defaultValue={customer.lastName}
        />
      </div>
      <Field
        label="Address"
        name="address1"
        autoComplete="address-line1"
        defaultValue={address?.address1}
      />
      <Field
        label="Apartment, suite, etc."
        name="address2"
        autoComplete="address-line2"
        defaultValue={address?.address2}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="City"
          name="city"
          autoComplete="address-level2"
          defaultValue={address?.city}
        />
        <Field
          label="State / province"
          name="province"
          autoComplete="address-level1"
          defaultValue={address?.province}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="ZIP code" name="zip" autoComplete="postal-code" defaultValue={address?.zip} />
        <Field label="Country" name="country" defaultValue={address?.country} />
        <Field label="Country code" name="countryCode" defaultValue={address?.countryCode} />
      </div>
      <Field
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={address?.phone}
      />
      <fieldset disabled={pending} className="contents">
        <ThemeButton type="submit" block>
          {pending ? 'Saving…' : 'Save'}
        </ThemeButton>
      </fieldset>
    </form>
  );
}
