# Deploying the demo

This puts the whole platform on a public URL so it can be opened and clicked
through. It is **a demo deployment, not a service**: no backups, no monitoring,
no managed database, and the seeded demo shop keeps its published credentials on
purpose. If the box dies, rebuild it — `db-setup` reseeds the demo on first boot.

Everything below runs on one VM. Budget **4 GB RAM minimum**; the admin's Next
build is the memory-hungry step and a 2 GB host OOMs partway through it.

---

## 1. DNS first — before the first `up`

Point these at the VM's IP, as A records:

| Record | Serves |
|---|---|
| `example.com` | redirect to the admin |
| `www` | redirect to the admin |
| `admin` | the Shopify-parity admin |
| `api` | the REST API |
| `assets` | object storage (product images) |
| `demo` | the seeded demo storefront |
| `*` *(optional)* | storefronts for shops signed up through the UI |

**Do this before deploying, not after.** Every app container waits on Caddy's
healthcheck, and Caddy only reports healthy once it has certificates — which
needs these names resolving and ports 80/443 reachable. Wrong DNS doesn't
degrade the stack, it stops it from starting at all.

The wildcard is optional and only matters if you want storefronts for shops that
visitors sign up. Those get a certificate minted on first visit, gated by
`/health/tls-ask` so only hostnames that are really a shop can trigger issuance.

## 2. Configure

```bash
git clone https://github.com/pauljurgens11/shopify.git && cd shopify
cp .env.example .env
```

Then edit `.env`. Four things, and the first two are not optional:

```bash
# Regenerate BOTH. The shipped values are in the repo — leaving them means
# anyone who has read it can forge a staff session for any shop on the box.
openssl rand -hex 32   # → SESSION_SECRET
openssl rand -hex 32   # → VAULT_MASTER_KEY

# Your domain and a contact address for Let's Encrypt.
BASE_DOMAIN=example.com
CADDY_TLS=you@example.com

# The AI storefront builder. With a key it generates themes live; without one it
# falls back to three canned presets and the demo still works.
ANTHROPIC_API_KEY=sk-ant-...
```

`BASE_DOMAIN` and `CADDY_TLS` are read by Compose, not by the app, so they go in
`.env` but deliberately **not** in `.env.example` — CI requires that file to
match the app's env schema exactly.

> On the Anthropic key: a public URL means anyone can run theme generations on
> your account. The only throttle is the admin API rate limit (40 req/s per IP).
> Use a **separate key with a spend limit set in the Anthropic Console** rather
> than your main one.

Leaving `CADDY_TLS` unset falls back to Caddy's internal CA, which is what makes
`BASE_DOMAIN=localhost` work with no DNS — useful for a dry run, wrong for a
real domain (every visitor gets a certificate warning).

## 3. Deploy

```bash
docker compose -f docker-compose.prod.yml --profile mail up -d --build
```

Two flags that matter:

- **`--build` is required, every time.** The admin bakes its public API URL into
  the browser bundle at build time, so the prebuilt GHCR images only work on the
  domain they were built for. Pull them instead and the admin loads but every
  request from the page goes to `api.lvh.me:3001` and fails.
- **`--profile mail`** starts Mailpit. Without it the worker's order-confirmation
  jobs fail and retry forever, filling the queue and the logs for no reason.

First boot takes a few minutes: four image builds, then `db-setup` runs the
migrations and seeds the demo shop.

## 4. Check it came up

```bash
docker compose -f docker-compose.prod.yml ps          # every service healthy
docker compose -f docker-compose.prod.yml logs caddy  # certificate issuance
```

Then open `https://admin.example.com` and sign in as `owner@demo.dev` /
`password123`, and `https://demo.example.com` for the storefront. The bare
domain redirects to the admin, so that is the URL to hand out.

`docs/DEMO.md` is the click-through path once it's up.

---

## Living with it

**Visitors will change the demo shop.** Anyone with the link can sign in as the
owner, so products get deleted and themes get republished. That is the trade for
a demo that needs no accounts. To reset:

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml --profile mail up -d --build
```

`-v` drops the volumes, so this wipes Postgres, Redis and uploaded images and
reseeds from scratch. There is nothing to preserve — that is the point.

**Nothing is indexed.** Caddy sends `X-Robots-Tag: noindex, nofollow, noarchive`
on the admin, the storefronts and the API. This is a study clone that renders
Shopify's name and mark (see the note at the end of the README); it should not
turn up in search results.

**Nothing here is PCI-scoped.** The vault demonstrates PAN isolation — the card
number goes from the browser straight to `/vault/tokenize` and only a
`card_tok_…` reaches the checkout server — but the default processor is the mock
adapter and this is not a certified environment. Use `4242 4242 4242 4242`.
Never a real card.

## Deliberately not done

Skipped because this is a demo, and each would be wrong to skip for anything
else: database backups, log shipping, error tracking, uptime monitoring, managed
Postgres/Redis/S3, secret management, and any limit on shop signups. The scale
path for all of it is described in the README's *Production architecture*
section — none of it is wired up here.
