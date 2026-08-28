import type { Metadata } from 'next';
import '@shopify/polaris/build/esm/styles.css';
import { Providers } from '../components/shell/providers.tsx';

// SPEC §1: the product is "Merchant" wherever a brand name is unavoidable.
// Never the Shopify name or logo.
export const metadata: Metadata = {
  title: 'Merchant',
  description: 'Merchant admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
