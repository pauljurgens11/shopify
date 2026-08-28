'use client';

/**
 * Polaris + React Query providers (SPEC §3, §9). Owner: WS-A.
 *
 * `AppProvider` with the DEFAULT theme is what buys pixel parity — do not pass a
 * custom theme, and do not add global CSS. If a component fights you for more
 * than 20 minutes, use plain JSX with `--p-*` tokens and log it in DECISIONS.md.
 */
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { PolarisLink } from './polaris-link.tsx';

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state so a hot reload does not discard the cache on every edit.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The admin is a dashboard: refetching on every window focus makes
            // Shopify-style optimistic saves flicker.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* linkComponent makes every Polaris `url` a client-side navigation
          instead of a full document load — see polaris-link.tsx. */}
      <AppProvider i18n={enTranslations} linkComponent={PolarisLink}>
        {children}
      </AppProvider>
    </QueryClientProvider>
  );
}
