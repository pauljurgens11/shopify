# Workstream review status

| | |
|---|---|
| **Session** | `17a023ad-a6e9-4048-9ed2-1848fdab9dfe` |
| **Started** | 2026-08-29T07:08:38.760Z |
| **Ended** | 2026-08-29T07:10:15.720Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

have all the workstreams except for H been reveiwed?

🔧 **Bash**
```
ls docs/ && echo "---" && ls docs/reviews 2>/dev/null | head -50
```

> **↳ result**
> ```
> AGENT-LOG.md
> DEMO.md
> PARALLEL-AGENTS.md
> WORKSTREAMS.md
> issues
> ---
> ```

🔧 **Bash**
```
grep -in "review" docs/AGENT-LOG.md | head -60; echo "=== GITLOG ==="; git log --oneline -60 | grep -i "review"
```

> **↳ result**
> ```
> 15:2026-08-28 12:35 | WS-C | DONE C1 discounts engine — applyDiscounts() in apps/api/src/services/discounts/engine.ts is pure and importable now (E3 checkout totals, C6 preview). Contracts additions: DiscountEngineResult, DiscountedLine, DiscountRejectionReason, DiscountAppliesTo, DiscountableLine types. apps/api no longer runs with --passWithNoTests.
> 65:2026-08-28T15:05Z | WS-F | WS-F (F4): the builder API is `/admin/api/themes` — GET `/versions`, GET `/versions/:id`, POST `/versions/:id/{publish,restore}`, POST `/presets/:name/apply`, GET `/preview-token?versionId=`, GET/POST `/conversation`. POST /conversation returns 202 `{jobId, message}`; poll GET /conversation until the pending assist
> … [truncated, 13,897 more chars]
> ```

🔧 **Bash**
```
grep -in "critical.review\|review" docs/AGENT-LOG.md | grep -oiE "WS-[A-H]|WS-QA" | sort | uniq -c; echo "=== all review lines with ws ==="; grep -in "critical.review" docs/AGENT-LOG.md
```

> **↳ result**
> ```
> 1 WS-A
>    5 WS-B
>    3 WS-C
>    3 WS-D
>   11 WS-E
>   10 WS-F
>    2 WS-G
>    2 WS-H
>    1 WS-QA
>    1 ws-b
>    1 ws-c
>    1 ws-d
>    1 ws-e
>    2 ws-f
>    2 ws-g
>    1 ws-h
> === all review lines with ws ===
> 181:2026-08-28T23:59Z | WS-B | Critical-review fixes (branch ws-b/critical-review-fixes): (1) form-shaped product PUT no longer wipes variant fields it does not carry [contracts]; (2) option rename keeps variant ids/skus/stock, client + server; (3) the real Locations page now lives at /store/{slug}/locations, REPLACING A4's placeholder as instructed (settings/locations removed — nothing linked it); (4) smart-collection condition value field holds raw typed text (the minor-units round-trip made "$25" unty
> … [truncated, 3,409 more chars]
> ```

🔧 **Bash**
```
grep -in "WS-A\b" docs/AGENT-LOG.md | tail -20; echo "=== E ==="; grep -in "^.*WS-E |" docs/AGENT-LOG.md | tail -15
```

> **↳ result**
> ```
> 17:2026-08-28 12:50 | WS-D | Fixed a platform bug found by D1's rate-limited route: app.ts errorResponseBuilder returned a plain object, but @fastify/rate-limit THROWS that value — with no statusCode it fell through to 500. It now returns `new ApiError('rate_limited', …)`, so any route with `config.rateLimit` gets a real SPEC-shaped 429. WS-A: one-line change in your file, flagged rather than silently kept.
> 29:2026-08-28 12:05 | WS-A | CLAIM A1 (auth, sessions, tenant resolution) | branch ws-a/auth-sessions-tenancy. Lands `lib/{redis,sessions,permissions}.ts`, `plugins/{auth,csrf}.ts`, tenancy onRequest resolution, `routes/auth/**`, and the `apps/api` vitest harness that A2 builds on. Everyt
> … [truncated, 14,102 more chars]
> ```

🔧 **Bash**
```
git log --oneline --all | grep -iE "review" ; echo "=== branches ==="; git branch -a | head -40; echo "=== PRs ==="; gh pr list --state all --limit 60 --json number,title,state,mergedAt --template '{{range .}}{{.number}} {{.state}} {{.title}}{{"\n"}}{{end}}' 2>/dev/null | grep -i review
```

> **↳ result**
> ```
> 782a05a fix(ws-c): critical-review fixes — stock moves once, refunds idempotent, races closed [contracts] [schema] (#84)
> bcc735c fix(ws-f): builder state machine, preview-token refresh, empty states [contracts] (#83)
> e19bcad fix(ws-f): builder state machine, preview-token refresh, empty states [contracts]
> e94a811 fix(ws-d): critical-review fixes — idempotent charge retries, orders/paid on capture, order settlement, refund recovery [contracts] (#78)
> 0b06068 fix(ws-d): the code for the review fixes — pay router, routes, contracts, Settings→Payments UI [contracts]
> 21bd598 Merge remote-tracking branch 'origin/main' into ws-d/review-fixes
> 9e2a5fe fix(ws-d): critical-review fixes — idempotent char
> … [truncated, 4,311 more chars]
> ```

🔧 **Bash**
```
git branch -a | sed -n '40,200p'
```

> **↳ result**
> ```
> ws-a/dev-plan-issue-backlog
>   ws-a/log-a1-done
>   ws-a/log-a3-done
> + ws-a/production-stack
>   ws-a/skeleton-review-fixes
>   ws-a/tenancy-suite
>   ws-a/verify-pr-gate
> + ws-b/collections-api
> + ws-b/collections-inventory-ui
> + ws-b/critical-review-fixes
>   ws-b/files-media
>   ws-b/inventory-api
>   ws-b/issue-skill
>   ws-b/products-admin-ui
>   ws-b/products-api
> + ws-b/skill-seam
>   ws-b/skill-subagents
>   ws-b/skill-tdd
>   ws-b/variant-update-fixes
>   ws-c/critical-review-fixes
>   ws-c/entered-code-guard
> + ws-c/idle
>   ws-c/orders-admin-ui
>   ws-d/adapters
>   ws-d/log-d1-done
>   ws-d/payment-router
> + ws-d/payments-settings-ui
>   ws-d/refund-race-capture-guard
> + ws-d/review-fixes
>   ws-d/vault
>   ws-d/vault-tokenize-t
> … [truncated, 2,207 more chars]
> ```

🔧 **Bash**
```
git log --oneline main | grep -iE "ws-a|ws-e" | head -30
```

> **↳ result**
> ```
> 887ae0b fix(ws-e): enforce oncePerCustomer at checkout via the engine's priorUsage seam (#85)
> d9b1d50 feat(ws-e): storefront customer accounts — register/login, /account pages, per-shop sessions [contracts] (#75)
> 3e03b77 feat(ws-e): checkout UI, hosted card fields and confirmation (#61)
> 58b212b feat(ws-a): settings hub — general, taxes, checkout, shipping, staff [contracts] (#55)
> 3236629 feat(ws-e): storefront pages rendered from the published theme (#53)
> c9caf31 feat(ws-e): checkout API — lifecycle, shipping, taxes, complete [contracts] (#49)
> 1c8ae7b docs(ws-a): log A3 complete (PR #39) (#41)
> 9d7b39a feat(ws-a): keyboard navigation in global search + detail placeholders (#39)
> 47a301d fix(ws
> … [truncated, 942 more chars]
> ```

🔧 **Bash**
```
for b in claude/workstream-a-critical-review-4a7c23 claude/workstream-b-critical-review-1fb97e claude/workstream-d-critical-review-631161 claude/workstream-g-critical-review-53f715 ws-a/skeleton-review-fixes; do echo "== $b"; git log --oneline main..$b 2>/dev/null | head -5; done
```

> **↳ result**
> ```
> == claude/workstream-a-critical-review-4a7c23
> == claude/workstream-b-critical-review-1fb97e
> == claude/workstream-d-critical-review-631161
> == claude/workstream-g-critical-review-53f715
> == ws-a/skeleton-review-fixes
> ba708f0 fix(ws-a): close tenancy upsert hole, fix first-run scripts, align CLAUDE.md with tooling
> ```

🔧 **Bash**
```
tail -25 docs/AGENT-LOG.md
```

> **↳ result**
> ```
> 2026-08-28T23:59Z | WS-H | DONE H2 Playwright smoke — all five flows real, green 3x locally + pnpm verify | PR #74. Config hardening: port-based webServer probes + browser host-resolver rule for *.lvh.me. Includes the refund-tax fix (see the WS-H lines above) — [contracts]: refundCalculationSchema gains taxAmount.
> 2026-08-28T15:58Z | WS-E | E5 is PR #75 (auto-merge armed) — supersedes the 'PR pending' note above.
> 2026-08-28T16:20Z | WS-H | CLAIM H3 polish sweep, README, demo script | branch ws-h/polish-sweep. Parity audit + cross-cutting empty-state/skeleton/toast licence, README quickstart, docs/DEMO.md. Supersedes the unpushed ws-h/polish-readme-demo claim (zero work on it).
> 2026-08-28T20:
> … [truncated, 11,700 more chars]
> ```

### 🤖 Claude

Checked the log, branches, and merged PRs. Short answer: **no — E is the real gap, and A's review never produced any fixes.**

| WS | Critical review run? | Fixes landed |
|---|---|---|
| A — platform/shell/settings | Yes (`claude/workstream-a-critical-review-4a7c23`, read-only session) | **None on `main`.** No `ws-a` fix PR exists |
| B — catalog | Yes (`claude/workstream-b-critical-review-1fb97e`) | PR #66 |
| C — orders/customers/discounts | Yes | PR #84 |
| D — pay | Yes (`claude/workstream-d-critical-review-631161`) | PR #78 |
| E — storefront/checkout/accounts | **No** | — |
| F — theme/builder | Yes | PR #83 (+ `ws-f/ai-queue-shared-producer`) |
| G — webhooks/analytics/apps | Yes (`claude/workstream-g-critical-review-53f715`) | PR #77 |
| H — seed/e2e/polish | Not as a scope, but it got a review *follow-up* (`ws-h/e2e-hardening`, PR-level) | e2e hardening + #82 |

Two things worth flagging beyond your question:

- **E is the biggest unreviewed surface** — storefront pages, checkout API + UI, hosted card fields, customer accounts. Everything that's been fixed in E so far came from *other* workstreams' reviews (the `oncePerCustomer` wiring in #85 came out of C's review, and D's review left an open handoff: `savePaymentMethod` in `packages/pay/src/router.ts` still has no caller, so customers can't save cards).
- **A was reviewed but nothing came of it.** The known-confirmed A items are still sitting in [AGENT-LOG.md](docs/AGENT-LOG.md) as "NOT fixed": no `totalCount` on `paginated()` so no index can render "1–50 of N", and `PageSkeleton` flashing a phantom primary-action button. H picked up the full-width and customer-name items in #82; the rest are untouched.

Want me to run `critical-review` on E, or re-run A and land its fixes?
