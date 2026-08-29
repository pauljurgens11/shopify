# Admin shell task

| | |
|---|---|
| **Session** | `5ed70db2-f2ac-40f8-81c5-dbeb21076a34` |
| **Started** | 2026-08-28T13:03:03.844Z |
| **Ended** | 2026-08-28T13:03:16.078Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

which task is for the admin shell

### 🤖 Claude

I'll look at the issue backlog to find the admin shell task.

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/docs/issues/
```

> **↳ result**
> ```
> A1-auth-sessions-tenancy.md
> A2-tenancy-suite.md
> A3-admin-shell.md
> A4-settings-hub.md
> A5-production-stack.md
> B1-products-api.md
> B2-files-media.md
> B3-collections-api.md
> B4-inventory-locations-api.md
> B5-products-admin-ui.md
> B6-collections-inventory-admin-ui.md
> C1-discounts-engine.md
> C2-orders-api.md
> C3-fulfillment-refund-api.md
> C4-customers-api.md
> C5-orders-admin-ui.md
> C6-customers-discounts-admin-ui.md
> D1-vault.md
> D2-processor-adapters.md
> D3-payment-router.md
> D4-payments-settings-ui.md
> E1-storefront-api-cart.md
> E2-storefront-pages.md
> E3-checkout-api.md
> E4-checkout-ui.md
> E5-customer-accounts.md
> F1-theme-engine-core.md
> F2-marketing-sections.md
> F3-themes-api-ai-job.md
> F4-builder-admin-ui.md
> G1-wo
> … [truncated, 183 more chars]
> ```

🔧 **Bash**
```
head -40 docs/issues/A3-admin-shell.md && echo "=== INDEX ===" && grep -n "A3" docs/issues/INDEX.md docs/AGENT-LOG.md | head -20
```

> **↳ result**
> ```
> # A3 — Admin shell: Frame/TopBar/Navigation, login, API client
> 
> | | |
> |---|---|
> | Workstream | A |
> | Size | L |
> | Depends on | A1 (login endpoint; shell layout can start before it lands) |
> | Unblocks | every admin UI issue (A4, B5, B6, C5, C6, D4, F4, G3, G4) |
> | Branch | `ws-a/admin-shell` |
> 
> ## You own
> ```
> apps/admin/src/app/** (login page, /store/[slug] layout + route group)
> apps/admin/src/components/shell/**
> apps/admin/src/lib/** (new: api-client, hooks, session)
> ```
> Do NOT edit `apps/admin/src/navigation/items/*` (other workstreams' leaf files).
> 
> ## Context
> Only `Providers` (React Query + Polaris `AppProvider`) and a placeholder
> `page.tsx` exist. The navigation registry (`src/navigation
> … [truncated, 5,720 more chars]
> ```

### 🤖 Claude

**[A3 — Admin shell: Frame/TopBar/Navigation, login, API client](docs/issues/A3-admin-shell.md)** (workstream A, size L, branch `ws-a/admin-shell`).

It's already **done and merged** — landed as PR #19, then completed by PR #39 (search keyboard navigation + detail placeholders), logged at [docs/AGENT-LOG.md:101](docs/AGENT-LOG.md:101).

What it owns: `apps/admin/src/app/**` (login/signup, `/store/[slug]` layout), `apps/admin/src/components/shell/**`, `apps/admin/src/lib/**`. Note the ownership rule in CLAUDE.md §3 — the shell is WS-A's; other workstreams only edit their leaf nav file `apps/admin/src/navigation/items/<area>.ts`.

If you're picking up admin work now, the unblocked follow-ons are A4 (settings hub), B5, B6, C5, C6, D4, F4, G3, G4 — all of which build pages *inside* this shell.
