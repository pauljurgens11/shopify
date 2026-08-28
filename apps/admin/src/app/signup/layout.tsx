import type { Metadata } from 'next';

/** See login/layout.tsx — a client page cannot export metadata, so this does. */
export const metadata: Metadata = { title: 'Create your store' };

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
