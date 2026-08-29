'use client';

/**
 * The Media card (PARITY.md: left column, drag-drop grid). Owner: WS-B (B5).
 *
 * Uploads go straight to the bucket: the API signs a PUT (B2), the browser
 * sends the bytes, and only the resulting public URL comes back through the
 * product save. Nothing here posts a file to the API.
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
import { useCallback, useState } from 'react';
import { apiFetch } from '../../../../../lib/api.ts';
import type { ImageDraft } from '../../../../../lib/product-draft.ts';

/** Mirrors the contract's enum — the picker should not offer what presign refuses. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_BYTES = 20 * 1024 * 1024;

type Presigned = { uploadUrl: string; publicUrl: string };

async function uploadOne(file: File): Promise<string> {
  const presigned = await apiFetch<PresignUploadResponse>('/admin/api/files/presign', {
    method: 'POST',
    body: { filename: file.name, contentType: file.type, sizeBytes: file.size },
  });

  const { uploadUrl, publicUrl } = presigned as Presigned;
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    // The signature covers this header; a mismatch is a 403 from the bucket.
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);

  return publicUrl;
}

export function MediaCard({
  images,
  onChange,
}: {
  images: ImageDraft[];
  onChange: (images: ImageDraft[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    async (files: File[]) => {
      const usable = files.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_BYTES);
      const rejected = files.length - usable.length;
      setError(
        rejected > 0
          ? `${rejected} file${rejected > 1 ? 's were' : ' was'} not a supported image under 20 MB.`
          : null,
      );
      if (usable.length === 0) return;

      setUploading(true);
      try {
        const urls = await Promise.all(usable.map(uploadOne));
        onChange([...images, ...urls.map((url) => ({ url, altText: '' }))]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not upload that image.');
      } finally {
        setUploading(false);
      }
    },
    [images, onChange],
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingSm">
          Media
        </Text>

        {images.length > 0 ? (
          <InlineStack gap="200" wrap>
            {images.map((image, index) => (
              <BlockStack key={image.url} gap="100">
                <Box
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  overflowX="hidden"
                  overflowY="hidden"
                  width="112px"
                  minHeight="112px"
                >
                  {/* Plain img, not next/image: these are arbitrary bucket URLs and
                      the admin is not the surface with a performance budget. */}
                  {/** biome-ignore lint/performance/noImgElement: see above */}
                  <img
                    src={image.url}
                    alt={image.altText}
                    width={112}
                    height={112}
                    style={{ objectFit: 'cover', display: 'block', width: 112, height: 112 }}
                  />
                </Box>
                <InlineStack gap="050" align="center">
                  <Button
                    size="micro"
                    variant="tertiary"
                    accessibilityLabel={`Move image ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    ←
                  </Button>
                  <Button
                    size="micro"
                    variant="tertiary"
                    accessibilityLabel={`Move image ${index + 1} later`}
                    disabled={index === images.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    →
                  </Button>
                  <Button
                    size="micro"
                    variant="tertiary"
                    tone="critical"
                    accessibilityLabel={`Remove image ${index + 1}`}
                    onClick={() => onChange(images.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </InlineStack>
              </BlockStack>
            ))}
          </InlineStack>
        ) : null}

        <DropZone accept={ACCEPTED.join(',')} type="image" onDrop={accept} allowMultiple>
          {/* Shopify's empty state offers "Upload new" and "Select existing"
              over "Accepts images, videos, or 3D models". There is no media
              library to select from and the bucket only takes images, so the
              copy says what is true rather than what is on the real page. */}
          <DropZone.FileUpload
            actionTitle={uploading ? 'Uploading…' : 'Upload new'}
            actionHint="Accepts images"
          />
        </DropZone>

        {error ? <InlineError message={error} fieldID="product-media" /> : null}
      </BlockStack>
    </Card>
  );
}
