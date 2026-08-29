'use client';

import {
  Badge,
  Banner,
  Button,
  ButtonGroup,
  InlineStack,
  Select,
  Spinner,
  Text,
  Tooltip,
} from '@shopify/polaris';
/**
 * The live preview and its toolbar (SPEC §12). Owner: WS-F.
 *
 * The iframe points at the real storefront origin, so what the merchant sees
 * here is exactly what a shopper gets — same renderer, same cookies, same
 * cache. A proxied or server-rendered mock would drift the moment WS-E changed
 * anything.
 */
import { RefreshIcon } from '@shopify/polaris-icons';
import type { ApiError } from '../../../../lib/api.ts';
import { type PreviewPage, previewUrl } from './preview-url.ts';

const DEVICE_WIDTH = { desktop: '100%', mobile: '390px' } as const;
export type Device = keyof typeof DEVICE_WIDTH;

export function PreviewPane({
  shopSlug,
  page,
  onPageChange,
  device,
  onDeviceChange,
  token,
  tokenError,
  onRetryToken,
  productHandle,
  collectionHandle,
  nonce,
  ready,
  onRefresh,
  isPublished,
  hasVersion,
  publishing,
  onPublish,
  onOpenHistory,
}: {
  shopSlug: string;
  page: PreviewPage;
  onPageChange: (page: PreviewPage) => void;
  device: Device;
  onDeviceChange: (device: Device) => void;
  token: string | null;
  /** Set when a draft's token request failed and there is no token to fall back on. */
  tokenError: ApiError | null;
  onRetryToken: () => void;
  productHandle: string | null;
  collectionHandle: string | null;
  nonce: number;
  /** False while a draft's preview token is still loading. */
  ready: boolean;
  onRefresh: () => void;
  isPublished: boolean;
  hasVersion: boolean;
  publishing: boolean;
  onPublish: () => void;
  onOpenHistory: () => void;
}) {
  const src = previewUrl({
    shopSlug,
    page,
    token,
    productHandle,
    collectionHandle,
    nonce,
  });

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: 'var(--p-space-300)',
          borderBlockEnd: 'var(--p-border-width-025) solid var(--p-color-border)',
          background: 'var(--p-color-bg-surface)',
        }}
      >
        <InlineStack align="space-between" blockAlign="center" gap="300" wrap={false}>
          <InlineStack gap="300" blockAlign="center" wrap={false}>
            <div style={{ minWidth: 150 }}>
              <Select
                label="Page"
                labelHidden
                value={page}
                onChange={(value) => onPageChange(value as PreviewPage)}
                options={[
                  { label: 'Home', value: 'home' },
                  { label: 'Product', value: 'product' },
                  { label: 'Collection', value: 'collection' },
                ]}
              />
            </div>

            <ButtonGroup variant="segmented">
              <Button pressed={device === 'desktop'} onClick={() => onDeviceChange('desktop')}>
                Desktop
              </Button>
              <Button pressed={device === 'mobile'} onClick={() => onDeviceChange('mobile')}>
                Mobile
              </Button>
            </ButtonGroup>

            <Tooltip content="Reload the preview">
              <Button icon={RefreshIcon} onClick={onRefresh} accessibilityLabel="Reload preview" />
            </Tooltip>
          </InlineStack>

          <InlineStack gap="300" blockAlign="center" wrap={false}>
            {/* The state model has to be legible or the demo fumbles (F4). */}
            {hasVersion ? (
              isPublished ? (
                <Badge tone="success">Live</Badge>
              ) : (
                <Text as="span" variant="bodySm" tone="subdued">
                  Viewing draft · unpublished changes
                </Text>
              )
            ) : null}

            <Button onClick={onOpenHistory}>Version history</Button>
            <Button
              variant="primary"
              loading={publishing}
              disabled={!hasVersion || isPublished}
              onClick={onPublish}
            >
              Publish
            </Button>
          </InlineStack>
        </InlineStack>
      </div>

      <div
        style={{
          minHeight: 0,
          background: 'var(--p-color-bg-surface-secondary)',
          display: 'flex',
          justifyContent: 'center',
          padding: device === 'mobile' ? 'var(--p-space-400)' : 0,
        }}
      >
        {/* Three states, all visible: a broken token gets a banner with a
            retry, a loading one a spinner — never an empty grey rectangle.
            The iframe has no key={device}: toggling Desktop/Mobile only
            resizes it — remounting would reload the storefront (white flash). */}
        {tokenError ? (
          <div style={{ width: '100%', padding: 'var(--p-space-400)', alignSelf: 'start' }}>
            <Banner
              tone="critical"
              title="Preview couldn’t be loaded"
              action={{ content: 'Try again', onAction: onRetryToken }}
            >
              <p>{tokenError.message}</p>
            </Banner>
          </div>
        ) : !ready ? (
          <div style={{ alignSelf: 'center' }}>
            <Spinner accessibilityLabel="Loading preview" size="large" />
          </div>
        ) : (
          <iframe
            title="Storefront preview"
            src={src}
            style={{
              width: DEVICE_WIDTH[device],
              height: '100%',
              border:
                device === 'mobile'
                  ? 'var(--p-border-width-025) solid var(--p-color-border)'
                  : 'none',
              borderRadius: device === 'mobile' ? 'var(--p-border-radius-400)' : 0,
              background: 'var(--p-color-bg-surface)',
            }}
          />
        )}
      </div>
    </div>
  );
}
