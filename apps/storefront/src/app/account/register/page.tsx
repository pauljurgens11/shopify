/**
 * `/account/register` (SPEC §8 — optional customer accounts). Owner: WS-E (E5).
 * Registering with an email that already ordered as a guest claims that order
 * history — the API sets the password on the existing customer row.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { shopContext } from '../../../lib/shop.ts';
import { RegisterForm } from '../forms.tsx';
import { currentCustomer } from '../session.ts';

export const metadata: Metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  // shopContext(), not resolveShopSlug(): the slug only parses the Host, so an
  // unknown subdomain produced a working sign-in form for a store that does not
  // exist. This 404s instead, and the layout's fetch is reused (React cache).
  const { slug } = await shopContext();
  if (await currentCustomer(slug)) redirect('/account');

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="font-heading text-3xl tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-text/60">Track orders and check out faster next time.</p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-text/70">
        Already have an account?{' '}
        <a href="/account/login" className="underline">
          Sign in
        </a>
      </p>
    </main>
  );
}
