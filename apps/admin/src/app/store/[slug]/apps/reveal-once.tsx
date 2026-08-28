'use client';

/**
 * The "you won't see this again" card (SPEC §8, G4). Owner: WS-G.
 *
 * The API stores only a hash, so this banner is the single moment the merchant
 * can capture the value. Everything here exists to make that moment hard to
 * miss and easy to act on: warning tone, the value in full, a copy button that
 * works, and a dismiss that really does destroy it.
 */
import { Badge, Banner, BlockStack, Box, Button, InlineStack, Text } from '@shopify/polaris';
import { ClipboardIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useToast } from '../../../../components/shell/toast-provider.tsx';

/**
 * The admin runs on `http://admin.lvh.me:3000`, which is not a secure context,
 * so `navigator.clipboard` is simply absent there — the modern API alone would
 * make the copy button dead on the one host we actually demo from. The
 * deprecated `execCommand` path is the fallback that still works over http.
 */
async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through — a denied permission is still a copy we can complete below.
  }

  const field = document.createElement('textarea');
  field.value = value;
  // Off-screen rather than hidden: `display:none` cannot hold a selection.
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export function RevealOnceCard({
  title,
  description,
  value,
  onDismiss,
}: {
  title: string;
  description: string;
  /** Plaintext, held in React state only — never re-fetchable. */
  value: string;
  onDismiss: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void copyToClipboard(value).then((ok) => {
      setCopied(ok);
      if (ok) toast.show('Copied to clipboard');
      else toast.error('Could not copy. Select the value and copy it manually.');
    });
  };

  return (
    <Banner tone="warning" title={title} onDismiss={onDismiss}>
      <BlockStack gap="300">
        <Text as="p">{description}</Text>

        <InlineStack gap="200" blockAlign="center" wrap={false}>
          {/* Hand-built rather than a read-only TextField: this is a value to
              read and copy, not to edit, and a form control invites a merchant
              to type over the one copy of their token. */}
          <Box
            background="bg-surface"
            borderColor="border"
            borderWidth="025"
            borderRadius="200"
            padding="300"
            width="100%"
            overflowX="scroll"
          >
            <Text as="span" variant="bodyMd" fontWeight="medium" breakWord>
              <span style={{ fontFamily: 'var(--p-font-family-mono)', whiteSpace: 'pre' }}>
                {value}
              </span>
            </Text>
          </Box>
          <Button icon={ClipboardIcon} onClick={copy} accessibilityLabel={`Copy ${title}`}>
            Copy
          </Button>
        </InlineStack>

        {copied ? (
          <InlineStack>
            <Badge tone="success">Copied</Badge>
          </InlineStack>
        ) : null}
      </BlockStack>
    </Banner>
  );
}
