'use client';

/**
 * Staff login (SPEC §8, PARITY.md). Owner: WS-A.
 *
 * The `name="email"` / `name="password"` attributes are load-bearing: H2's
 * smoke flow (a) selects on them. Do not rename them.
 */
import {
  Banner,
  Button,
  Form,
  FormLayout,
  Link,
  SkeletonBodyText,
  TextField,
} from '@shopify/polaris';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthCard } from '../../components/shell/auth-card.tsx';
import { useLogin } from '../../lib/session.ts';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  // Email is unique per shop, not globally (SPEC §7): the same address in two
  // stores gets a 400 asking for `shopSlug`, and the form has to actually offer
  // that field or the message "choose a store" is a dead end. Revealed once,
  // stays revealed — mutation errors reset on the next submit.
  const [askForShop, setAskForShop] = useState(false);

  // Only ever an in-app path: an absolute URL here would be an open redirect.
  // `//host` and `/\host` both reach another origin — browsers normalise the
  // backslash form to protocol-relative — so a single leading slash is the rule.
  const nextParam = searchParams.get('next');
  const next = nextParam && /^\/(?![/\\])/.test(nextParam) ? nextParam : null;

  const submit = () => {
    const slug = shopSlug.trim().toLowerCase();
    login.mutate(
      { email, password, ...(slug ? { shopSlug: slug } : {}) },
      {
        onSuccess: (session) => router.replace(next ?? `/store/${session.shop.slug}`),
        onError: (error) => {
          if (error.fieldErrors.shopSlug) setAskForShop(true);
        },
      },
    );
  };

  return (
    <AuthCard
      title="Log in"
      subtitle="Continue to your store"
      footer={<Link url="/signup">New to Shopify? Get started</Link>}
    >
      <Form onSubmit={submit}>
        <FormLayout>
          {login.error ? (
            <Banner tone="critical" title="Could not log in">
              <p>{login.error.message}</p>
            </Banner>
          ) : null}

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            error={login.error?.fieldErrors.email}
            requiredIndicator={false}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={login.error?.fieldErrors.password}
          />

          {askForShop ? (
            <TextField
              label="Store"
              name="shopSlug"
              autoComplete="off"
              helpText="The store name from its URL, e.g. aurora-supply-co."
              value={shopSlug}
              onChange={setShopSlug}
              error={login.error?.fieldErrors.shopSlug}
            />
          ) : null}

          <Button submit variant="primary" fullWidth loading={login.isPending}>
            Log in
          </Button>
        </FormLayout>
      </Form>
    </AuthCard>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to prerender (Next 15). The
  // fallback is the same card with skeleton lines rather than an empty one, so
  // the first screen of the demo does not visibly change height on hydration.
  return (
    <Suspense
      fallback={
        <AuthCard title="Log in" subtitle="Continue to your store">
          <SkeletonBodyText lines={4} />
        </AuthCard>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
