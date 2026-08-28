# G1 — Queue producer, webhook delivery, order confirmation email

| | |
|---|---|
| Workstream | G |
| Size | M |
| Depends on | — (grab immediately) |
| Unblocks | F3, G2, G4, C2/E3 event emission |
| Branch | `ws-g/worker-webhooks-email` |

## You own
```
apps/worker/src/** (except jobs/ai-*.ts — WS-F)
packages/config/src/queue.ts (new — the shared producer)
packages/contracts/src/webhooks.ts (additive)
```

## Context
The worker harness (`apps/worker/src/index.ts`) is real — one BullMQ Worker
per queue over `QUEUES`, dispatch by job name through the leaf-file registry —
but `jobs/index.ts` registers **zero jobs**, and there is **no producer
anywhere**: nothing in the API can enqueue. `nodemailer` is a declared,
unused dep; Mailpit runs in compose (SMTP :1025, UI :8025). Webhook schema:
`WebhookSubscription` (topic, url, secret), `WebhookDelivery` (attempts,
status, lastError).

## Build (SPEC §13)
1. **Producer** (`packages/config/src/queue.ts` — config is the shared-home
   for cross-app helpers): lazy BullMQ `Queue` per name +
   `enqueue(queue, jobName, payload, opts?)` with typed payloads from
   contracts. Also `emitWebhookEvent(shopId, topic, payload)` — looks up
   subscriptions is the worker's job; the API just enqueues the event.
   Deterministic job ids where natural (idempotency, SPEC §13).
2. **`jobs/webhook-deliver.ts`**: for an event, load matching
   `WebhookSubscription`s (tenant client from the payload's shopId), POST
   the contract-shaped payload with `X-Merchant-Hmac-Sha256` (HMAC-SHA256 of
   the raw body with the subscription secret) + topic/shop headers;
   per-delivery `WebhookDelivery` row updated on each attempt; **5 retries,
   exponential backoff** (BullMQ attempts/backoff — let the queue do it);
   final failure → status failed with lastError.
3. **`jobs/order-confirmation-email.ts`**: nodemailer → Mailpit (SMTP from
   env, console-log fallback per SPEC §3): order summary HTML (items, totals,
   address) — plain solid template, shop name as sender. E3 enqueues it.
4. **Registry**: register both in `jobs/index.ts` (the file exists for this;
   F3/G2 add theirs as leaf files).
5. A tiny in-repo webhook receiver script (`apps/worker/scripts/echo.ts` or
   similar) for the demo: prints received webhooks + verifies the HMAC —
   G4's "webhook demo" and H3's demo script point at it.

## Test plan (write first)
- Vitest (`apps/worker`): HMAC signature matches an independent computation;
  payload validates against the contract schema; delivery marks
  success/failure rows correctly against a local `http.createServer` fixture
  (real server, not a mock — one that 500s twice then 200s exercises retry
  counting logic if you surface it synchronously; keep the test fast by
  driving the processor function directly rather than through Redis).
  Remove `--passWithNoTests` from `apps/worker/package.json`.
- Manual: `pnpm dev`, enqueue a test event (tiny script), watch Mailpit UI
  get the email and the echo receiver print a verified webhook.
- `pnpm verify` green.

## Landmines
- Webhook payloads and topics come from `contracts/webhooks.ts` and
  `constants.WEBHOOK_TOPICS` — never free-form JSON.
- Never log subscription secrets or full payloads at info level.
- Delivery targets are merchant-supplied URLs — set a 5s timeout and don't
  follow redirects; that's the whole SSRF budget (SPEC §15 caps security
  effort; do not build allowlists).
