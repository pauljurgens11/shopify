/** Image/asset upload via MinIO presigned PUT (SPEC §16 WS-B). Owner: WS-B. */
import { z } from 'zod';

export const presignUploadInput = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
});

/**
 * The browser PUTs the file straight to S3/MinIO, then hands `publicUrl` back to
 * the API. Keeps large uploads off the Fastify process entirely.
 */
export const presignUploadResponse = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  key: z.string(),
  expiresInSeconds: z.number().int().positive(),
});
