'use client';

/**
 * The collection image (docs/parity/collection-detail.md → Left column 1).
 * Owner: WS-B (B6).
 *
 * Shopify puts it INSIDE the title card, as a ~145px square drop zone on the
 * left of the heading — not in a right-rail "Image" card. Empty, it is a dashed
 * square with an upload glyph centred.
 *
 * One image, uploaded straight to the bucket through B2's presign — the API
 * never sees the bytes.
 */
import type { PresignUploadResponse } from '@merchant/contracts/files';
import { BlockStack, Box, Button, DropZone, Icon, InlineError, Spinner } from '@shopify/polaris';
import { UploadIcon, XIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import { apiFetch } from '../../../../../lib/api.ts';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 20 * 1024 * 1024;
/** The square the capture measured. */
const SIDE = '145px';

export function CollectionImage({
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
    <BlockStack gap="100">
      <Box width={SIDE} minHeight={SIDE}>
        {imageUrl ? (
          <div style={{ position: 'relative', width: SIDE, height: SIDE }}>
            <Box
              borderWidth="025"
              borderColor="border"
              borderRadius="300"
              overflowX="hidden"
              overflowY="hidden"
            >
              {/* Plain img: an arbitrary bucket URL (see collection-items.tsx). */}
              {/** biome-ignore lint/performance/noImgElement: see above */}
              <img
                src={imageUrl}
                alt=""
                style={{ display: 'block', width: SIDE, height: SIDE, objectFit: 'cover' }}
              />
            </Box>
            <div
              style={{
                position: 'absolute',
                top: 'var(--p-space-100)',
                insetInlineEnd: 'var(--p-space-100)',
              }}
            >
              <Button
                size="micro"
                icon={XIcon}
                accessibilityLabel="Remove image"
                onClick={() => onChange(null)}
              />
            </div>
          </div>
        ) : (
          <div style={{ width: SIDE, height: SIDE }}>
            <DropZone
              accept={ACCEPTED.join(',')}
              type="image"
              allowMultiple={false}
              onDrop={accept}
              label="Collection image"
              labelHidden
              variableHeight
            >
              {/* An upload glyph centred in the square, as the capture shows —
                  `DropZone.FileUpload`'s button + hint does not fit 145px. */}
              <div
                style={{
                  height: SIDE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {uploading ? (
                  <Spinner size="small" accessibilityLabel="Uploading image" />
                ) : (
                  <Icon source={UploadIcon} tone="subdued" />
                )}
              </div>
            </DropZone>
          </div>
        )}
      </Box>

      {error ? <InlineError message={error} fieldID="collection-image" /> : null}
    </BlockStack>
  );
}
