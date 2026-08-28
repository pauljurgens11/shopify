# A5 — Production stack: prod compose, Caddy, image pipeline

| | |
|---|---|
| Workstream | A |
| Size | M |
| Depends on | — (independent; schedule for Day 2 — it must not steal Day 1 agents from features) |
| Unblocks | H3 (README "Production architecture"), Definition of Done credibility on "scalable infrastructure" |
| Branch | `ws-a/production-stack` |

## You own
```
docker-compose.prod.yml, deploy/caddy/Caddyfile (new)
.github/workflows/** (image push additions only)
apps/*/Dockerfile (fixes only if builds are broken)
```

## Context
SPEC §17: deploy is **documented + Dockerized, not required to be live**.
All four apps already have multi-stage Dockerfiles (Next apps build
`standalone` with `outputFileTracingRoot`; api/worker run tsx from source —
both logged decisions), and `main-checks` builds all four images post-merge.
What's missing is the composition that proves the architecture scales:
one command bringing up the full stack behind a reverse proxy with
wildcard tenant routing — the "one deployment serves many shops" story
made tangible.

## Build (SPEC §17)
1. **`docker-compose.prod.yml`**: postgres, redis, minio, mailpit (optional
   profile), api, worker, admin, storefront, caddy. Apps get env from a
   single `.env` (compose `env_file`); healthchecks on api/admin/storefront;
   `restart: unless-stopped`; api/worker/storefront scale-ready
   (`deploy.replicas` respected, no container-local state — sessions are
   already in Redis, files in MinIO).
2. **Caddy** (`deploy/caddy/Caddyfile`): wildcard routing per SPEC —
   `admin.{$BASE_DOMAIN}` → admin:3000, `api.{$BASE_DOMAIN}` → api:3001,
   `*.{$BASE_DOMAIN}` and custom domains → storefront:3002. Automatic TLS
   (internal CA for local verification; Let's Encrypt config commented for
   real domains). Storefront tenancy already keys off Host — verify the
   header passes through untouched.
3. **Storefront `CustomDomain` fallback** (small, this is its natural home):
   `apps/storefront/src/lib/tenant.ts` has the TODO — resolve unknown hosts
   against the `CustomDomain` table via the api (new tiny storefront-api
   endpoint or extend `/storefront/api/shop`), cached. Coordinate with WS-E
   via `docs/AGENT-LOG.md` since the file is theirs — or hand them a PR-ready
   snippet; do not land silently in their tree.
4. **CI**: extend the docker job on `main` to push images to GHCR tagged
   `sha` + `latest` (needs only the default `GITHUB_TOKEN` permissions
   block). Keep PR checks untouched — throughput rule.
5. **Verify end-to-end once**: `docker compose -f docker-compose.prod.yml
   up -d` on a clean machine → seeded stack reachable at
   `https://admin.localhost` + `https://demo.localhost` (Caddy internal TLS,
   `BASE_DOMAIN=localhost`), full purchase with the mock card works. Paste
   the transcript in the PR.

## Test plan
- The verification in step 5 IS the acceptance — no unit tests here
  (infra glue; SPEC §14 forbids testing it beyond the smoke that exists).
- `main-checks` docker job stays green; image push visible in GHCR.

## Landmines
- Do not introduce k8s manifests, Terraform, or a second orchestration
  flavor — compose + the README scale-path text is the SPEC's whole ask.
- No secrets in the compose file or Caddyfile — everything via `.env`
  (`VAULT_MASTER_KEY` and `SESSION_SECRET` regenerated for prod, noted in
  the README section H3 writes).
- Don't gate any feature work on this — if a Dockerfile fix is needed,
  smallest possible diff.
