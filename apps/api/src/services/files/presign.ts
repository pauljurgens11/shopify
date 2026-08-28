/**
 * Presigned uploads to MinIO/S3 (SPEC §16 row B). Owner: WS-B.
 *
 * The API never touches the bytes. It signs a PUT, the browser uploads straight
 * to the bucket, and the caller then stores the returned `publicUrl` — on
 * `ProductImage.url` (B1), a theme asset (F3), or wherever else. Proxying
 * uploads through Fastify would put a 20 MB body on the request path for
 * nothing (CLAUDE.md §9).
 *
 * The bucket is a single shared one with anonymous read enabled — deliberate,
 * so the storefront renders images without a signing round trip. Tenants are
 * separated by the key prefix, which is why `objectKey` is the security-
 * relevant part of this file and the filename never reaches it verbatim.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@merchant/config/env';
import { newId } from '@merchant/config/ids';

/** Long enough for a slow connection to start, short enough to be uninteresting if leaked. */
export const UPLOAD_URL_TTL_SECONDS = 300;

export type PresignInput = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type PresignResult = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSeconds: number;
};

/**
 * A filename is attacker-controlled text, not a path. Everything that could
 * make it behave like one — separators, `..`, leading dots, control characters
 * — is collapsed, so the result can only ever be a single segment under the
 * shop's prefix.
 */
export function safeFilename(filename: string): string {
  const base = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Split on both separators and take the last segment, the way basename would.
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-z0-9._-]+/g, '-')
    // A name that is only dots (`..`, `.`) would otherwise survive the filter.
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    // "Aurora Hero Shot!.png" would otherwise keep the hyphen the "!" became,
    // and these keys are visible in every storefront image URL.
    .replace(/-+\./g, '.')
    .slice(0, 80);

  return base || 'upload';
}

/**
 * `shops/{shopId}/img_{ulid}-{name}`.
 *
 * The shopId prefix is what keeps one bucket multi-tenant, and the id makes
 * every upload a new object — re-uploading `hero.png` never overwrites the
 * image a live product is already pointing at. Every upload here is an image
 * (the contract admits no other mime type), so the project's `img_` prefix is
 * the honest one to use rather than a bare ULID.
 */
export function objectKey(shopId: string, filename: string): string {
  return `shops/${shopId}/${newId('image')}-${safeFilename(filename)}`;
}

let client: S3Client | undefined;

/** Built lazily so importing this module does not require S3 config. */
function s3(): S3Client {
  const config = env();
  client ??= new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    // MinIO serves `endpoint/bucket/key`; virtual-host style would need DNS.
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export async function presignUpload(shopId: string, input: PresignInput): Promise<PresignResult> {
  const config = env();
  const key = objectKey(shopId, input.filename);

  // ContentType is signed, so the object is stored with the mime the client
  // declared and the browser renders it instead of downloading it. The size cap
  // is enforced at this boundary rather than in the signature: signing
  // ContentLength makes the upload fail on a one-byte mismatch, which costs the
  // demo more than the cap buys on a local bucket (SPEC §15 — baseline only).
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ContentType: input.contentType,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

  return {
    uploadUrl,
    // S3_PUBLIC_URL already ends in the bucket, so this is what the storefront
    // and ProductImage.url will hold verbatim.
    publicUrl: `${config.S3_PUBLIC_URL}/${key}`,
    key,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
  };
}
