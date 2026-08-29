import type { Metadata } from 'next';

/**
 * Title only. `page.tsx` is a client component, and a client component cannot
 * export `metadata` — so the one server file that can, does. The root layout's
 * template turns this into "Log in · Shopify".
 */
export const metadata: Metadata = { title: 'Log in' };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
