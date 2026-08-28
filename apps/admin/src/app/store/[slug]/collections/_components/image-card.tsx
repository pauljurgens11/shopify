'use client';

/**
 * The collection image (PARITY.md → Collection form, right column).
 * Owner: WS-B (B6).
 *
 * One image, uploaded straight to the bucket through B2's presign — the API
 * never sees the bytes.
 */
import type { PresignUploadResponse } from '@merchant/contracts/files';
import {
  BlockStack,
  Box,
  Button,
  Card,
  DropZone,
  InlineError,
  InlineStack,
  Text,
} from '@shopify/polaris';
import { useState } from 'react';
import { apiFetch } from '../../../../../lib/api.ts';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 20 * 1024 * 1024;

export function CollectionImageCard({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async (files: File[]) => {
    const file = files.find((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES);
    if (!file) {
      setError('Choose an image under 20 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const presigned = await apiFetch<PresignUploadResponse>('/admin/api/files/presign', {
        method: 'POST',
        body: { filename: file.name, contentType: file.type, sizeBytes: file.size },
      });
      const response = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      onChange(presigned.publicUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingSm">
          Image
        </Text>

        {imageUrl ? (
          <BlockStack gap="200">
            <Box borderWidth="025" borderColor="border" borderRadius="200" overflowX="hidden">
              {/* Plain img: an arbitrary bucket URL, and the admin has no
                  image performance budget (SPEC §10 is the storefront). */}
              {/** biome-ignore lint/performance/noImgElement: see above */}
              <img
                src={imageUrl}
                alt=""
                style={{ display: 'block', width: '100%', objectFit: 'cover' }}
              />
            </Box>
            <InlineStack>
              <Button variant="plain" tone="critical" onClick={() => onChange(null)}>
                Remove
              </Button>
            </InlineStack>
          </BlockStack>
        ) : (
          <DropZone accept={ACCEPTED.join(',')} type="image" onDrop={accept} allowMultiple={false}>
            <DropZone.FileUpload
              actionTitle={uploading ? 'Uploading…' : 'Add image'}
              actionHint="or drop a file to upload"
            />
          </DropZone>
        )}

        {error ? <InlineError message={error} fieldID="collection-image" /> : null}
      </BlockStack>
    </Card>
  );
}
