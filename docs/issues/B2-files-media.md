# B2 — File uploads (MinIO presigned) + product media

| | |
|---|---|
| Workstream | B |
| Size | M |
| Depends on | B1 |
| Unblocks | B5 (media card), F3/H1 (theme/seed images) |
| Branch | `ws-b/files-media` |

## You own
```
apps/api/src/routes/admin/files/**
apps/api/src/services/catalog/files.ts (or services/files/)
packages/contracts/src/files.ts (additive)
```

## Context
`docker-compose.yml` runs MinIO (S3 API on :9000, console :9001) and
`minio-init` creates a **publicly readable** `merchant-assets` bucket — public
read is deliberate so product images render on the storefront without
presigning. `packages/contracts/src/files.ts` sketches the request/response.
S3 creds/bucket come from `packages/config/src/env.ts` (`S3_*`). No S3 client
dependency exists yet — add `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
to `apps/api` (that pair is standard; not a stack substitution).

## Build (SPEC §16 row B)
1. `POST /admin/api/files/presign` — body `{ filename, mimeType, sizeBytes }` →
   validates (images only: png/jpeg/webp/gif; ≤10 MB), returns
   `{ uploadUrl, publicUrl, key }`. Key layout: `shops/{shopId}/{ulid}-{safe-name}`
   — shopId in the key path keeps tenants separated in one bucket.
2. Browser PUTs the file straight to MinIO (admin never proxies bytes), then
   attaches `publicUrl` via B1's product update (`ProductImage.url`).
3. `POST /admin/api/files/presign` is also what F3 (AI builder) and A4 may use
   for arbitrary theme assets — keep it product-agnostic.
4. CORS on the bucket: `minio-init` must allow PUT from admin origin — extend
   the `mc` script in `docker-compose.yml` if needed (you own that change;
   it's infra for your feature — coordinate via a `[shared]`-titled PR).

## Test plan (write first)
- Vitest: presign rejects a 50 MB request and an `application/x-msdownload`
  mime; key contains the shopId; returned publicUrl matches
  `S3_PUBLIC_URL`/bucket layout. (Signature math itself is the SDK's problem —
  don't test it.)
- Manual acceptance: `curl` the presign endpoint, `curl -T image.png` the
  uploadUrl, open the publicUrl in a browser — image renders.

## Landmines
- Never proxy file bytes through the API — presigned direct upload only.
- Don't add image resizing/thumbnailing pipelines — `next/image` on the
  storefront handles sizing (SPEC §10). Cut scope hard here.
- `.env.example` already carries `S3_*` — if you add a var, update
  `packages/config/src/env.ts` AND `.env.example` in the same commit
  (`pnpm verify` runs the parity check).
