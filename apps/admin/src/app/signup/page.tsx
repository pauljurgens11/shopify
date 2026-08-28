'use client';

/**
 * Create a store (SPEC §8, PARITY.md). Owner: WS-A.
 *
 * Asks for a store name only, not a URL — the API derives the slug and
 * de-duplicates it, the way Shopify's signup does. H2's smoke flow (e) signs up
 * a second shop through this page, so it is not optional chrome.
 */
import { Banner, Button, Form, FormLayout, Link, TextField } from '@shopify/polaris';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCard } from '../../components/shell/auth-card.tsx';
import { useSignup } from '../../lib/session.ts';

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();

  const [shopName, setShopName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    signup.mutate(
      { shopName, email, password, ...(firstName ? { firstName } : {}) },
      { onSuccess: (session) => router.replace(`/store/${session.shop.slug}`) },
    );
  };

  const fieldErrors = signup.error?.fieldErrors ?? {};

  return (
    <AuthCard
      title="Create your store"
      subtitle="Free while you build it"
      footer={<Link url="/login">Already have a store? Log in</Link>}
    >
      <Form onSubmit={submit}>
        <FormLayout>
          {signup.error && Object.keys(fieldErrors).length === 0 ? (
            <Banner tone="critical" title="Could not create the store">
              <p>{signup.error.message}</p>
            </Banner>
          ) : null}

          <TextField
            label="Store name"
            name="shopName"
            autoComplete="organization"
            helpText="Your store's web address is made from this."
            value={shopName}
            onChange={setShopName}
            error={fieldErrors.shopName}
          />
          <TextField
            label="Your name"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={setFirstName}
            error={fieldErrors.firstName}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            helpText="At least 8 characters."
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
          />

          <Button submit variant="primary" fullWidth loading={signup.isPending}>
            Create store
          </Button>
        </FormLayout>
      </Form>
    </AuthCard>
  );
}
