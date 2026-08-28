'use client';

/**
 * Staff login (SPEC §8, PARITY.md). Owner: WS-A.
 *
 * The `name="email"` / `name="password"` attributes are load-bearing: H2's
 * smoke flow (a) selects on them. Do not rename them.
 */
import { Banner, BlockStack, Button, Form, FormLayout, Link, TextField } from '@shopify/polaris';
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

  // Only ever an in-app path: an absolute URL here would be an open redirect.
  // `//host` and `/\host` both reach another origin — browsers normalise the
  // backslash form to protocol-relative — so a single leading slash is the rule.
  const nextParam = searchParams.get('next');
  const next = nextParam && /^\/(?![/\\])/.test(nextParam) ? nextParam : null;

  const submit = () => {
    login.mutate(
      { email, password },
      { onSuccess: (session) => router.replace(next ?? `/store/${session.shop.slug}`) },
    );
  };

  return (
    <AuthCard
      title="Log in"
      subtitle="Continue to your store"
      footer={<Link url="/signup">New to Merchant? Get started</Link>}
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

          <BlockStack gap="200">
            <Button submit variant="primary" fullWidth loading={login.isPending}>
              Log in
            </Button>
          </BlockStack>
        </FormLayout>
      </Form>
    </AuthCard>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to prerender (Next 15).
  return (
    <Suspense fallback={<AuthCard title="Log in">{null}</AuthCard>}>
      <LoginForm />
    </Suspense>
  );
}
