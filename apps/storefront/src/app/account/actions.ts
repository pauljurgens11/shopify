'use server';

/**
 * Account mutations as Server Actions (SPEC §8 — optional path). Owner: WS-E (E5).
 *
 * Same shape as the cart actions and for the same reason: the customer session
 * cookie is httpOnly, so only the server can forward it to the API and only the
 * server can re-issue the one the API sets on login/register. The API sets it
 * for its own origin (`{slug}.lvh.me:3001`); the storefront re-issues the
 * name/value pair for the page origin, exactly like the cart cookie.
 */
import { CUSTOMER_SESSION_COOKIE } from '@merchant/config/constants';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { storefrontApiUrl } from '../../lib/api.ts';
import { cookieValueFromSetCookie } from '../../lib/set-cookie.ts';
import { resolveShopSlug } from '../../lib/tenant.ts';
import { customerCookieHeader } from './session.ts';

export interface AccountActionResult {
  ok: boolean;
  /** Shopper-facing; E5's API writes real messages ("Incorrect email or password."). */
  message?: string;
}

async function accountRequest(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<AccountActionResult> {
  const slug = await resolveShopSlug();
  if (!slug) return { ok: false, message: 'Store not found.' };

  const cookie = await customerCookieHeader();
  const response = await fetch(storefrontApiUrl(slug, path), {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  // Login and register answer with a fresh session cookie; re-issue it for the
  // storefront origin or the very next request renders signed out.
  const issued = cookieValueFromSetCookie(
    response.headers.getSetCookie?.() ?? [],
    CUSTOMER_SESSION_COOKIE,
  );
  if (issued) {
    (await cookies()).set(CUSTOMER_SESSION_COOKIE, issued, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
    } | null;
    return {
      ok: false,
      message: payload?.errors?.[0]?.message ?? 'Something went wrong. Try again.',
    };
  }
  return { ok: true };
}

export async function loginAction(
  _prev: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  // No redirect() here: the form does a full navigation on success. A server-
  // action redirect makes Next refresh the whole tree inside the action
  // response, which trips over the layout's cached shop/theme fetches in dev
  // (E192 "notFound() in root layout"). See DECISIONS.md (E5).
  return accountRequest('POST', '/customers/login', {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
}

export async function registerAction(
  _prev: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  return accountRequest('POST', '/customers/register', {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  });
}

export async function logoutAction(): Promise<void> {
  const slug = await resolveShopSlug();
  const cookie = await customerCookieHeader();
  if (slug && cookie) {
    // Best-effort server-side destroy; the cookie delete below signs the
    // browser out even if the API is unreachable.
    await fetch(storefrontApiUrl(slug, '/customers/logout'), {
      method: 'POST',
      headers: { cookie },
      cache: 'no-store',
    }).catch(() => undefined);
  }
  (await cookies()).delete(CUSTOMER_SESSION_COOKIE);
}

export async function updateProfileAction(
  _prev: AccountActionResult | null,
  formData: FormData,
): Promise<AccountActionResult> {
  const text = (name: string) => String(formData.get(name) ?? '').trim();

  const address1 = text('address1');
  // The address block is all-or-nothing: without a street line there is no
  // address to save, and sending a partial one would 400 on required fields.
  const defaultAddress = address1
    ? {
        firstName: text('firstName') || null,
        lastName: text('lastName') || null,
        address1,
        address2: text('address2') || null,
        city: text('city'),
        province: text('province') || null,
        country: text('country'),
        countryCode: text('countryCode').toUpperCase(),
        zip: text('zip'),
        phone: text('phone') || null,
      }
    : undefined;

  const result = await accountRequest('PUT', '/customers/me', {
    firstName: text('firstName') || null,
    lastName: text('lastName') || null,
    ...(defaultAddress ? { defaultAddress } : {}),
  });
  if (result.ok) revalidatePath('/account');
  return result;
}
