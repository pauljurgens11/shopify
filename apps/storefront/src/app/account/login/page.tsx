/**
 * `/account/login` (SPEC §8 — optional customer accounts). Owner: WS-E (E5).
 * Minimal centered form; a signed-in customer goes straight to their account.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { shopContext } from '../../../lib/shop.ts';
import { LoginForm } from '../forms.tsx';
import { currentCustomer } from '../session.ts';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // shopContext(), not resolveShopSlug(): the slug only parses the Host, so an
  // unknown subdomain produced a working sign-in form for a store that does not
  // exist. This 404s instead, and the layout's fetch is reused (React cache).
  const { slug } = await shopContext();
  if (await currentCustomer(slug)) redirect('/account');

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="font-heading text-3xl tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-text/60">Your orders and details, in one place.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-text/70">
        New here?{' '}
        <a href="/account/register" className="underline">
          Create an account
        </a>
      </p>
    </main>
  );
}
