# Shopify UI parity files

| | |
|---|---|
| **Session** | `7cfb77db-52ec-4a6b-a25a-192ce3f2e34c` |
| **Started** | 2026-08-29T08:27:01.556Z |
| **Ended** | 2026-08-29T08:28:07.848Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/shopify-ui-parity-files-ee8f30` |
| **Branch** | `claude/shopify-ui-parity-files-ee8f30` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

there should be shopify ui parity files now in main. i want to do them one by one. list them to me

### 🤖 Claude

I'll check main for the parity files.

🔧 **Bash**
```
git fetch origin main -q && git log --oneline -5 origin/main
```

> **↳ result**
> ```
> fdba7ee docs(shared): raise Home parity confidence; capture the date-range popover (#95)
> 147549d fix(ws-h): critical-review fixes — seed determinism, e2e demo hygiene, refund tax corner, DECISIONS-239 enforcement (#94)
> 1a378a2 docs(shared): parity reference captured from the real Shopify admin (#93)
> 53c1b58 fix(shared): repo-review follow-ups — E7 publish-revalidation issue, seed ship_ ids, log findings (#92)
> 9a5e0d9 fix(shared): checkout money formatting, review issues, fail-loud redis slots (#88)
> ```

🔧 **Bash**
```
git ls-tree -r --name-only origin/main | grep -iE 'parity'
```

> **↳ result**
> ```
> docs/issues/H4-ux-motion-parity.md
> docs/issues/PARITY.md
> docs/parity/README.md
> docs/parity/admin-shell.md
> docs/parity/capture.md
> docs/parity/collection-detail.md
> docs/parity/customer-form.md
> docs/parity/dashboard.md
> docs/parity/home.md
> docs/parity/index-tables.md
> docs/parity/product-form.md
> scripts/check-env-parity.mjs
> ```

🔧 **Bash**
```
git show origin/main:docs/issues/PARITY.md | head -120; echo "=== README ==="; git show origin/main:docs/parity/README.md | head -80
```

> **↳ result**
> ```
> # PARITY.md — the shared picture of Shopify
> 
> **The KPI is "I can't tell it's not Shopify." Not "inspired by" — identical.**
> Eight agents building admin pages from memory produce eight interpretations;
> this file is the single memory everyone builds from. Every UI issue links
> here. If you know Shopify better than a line below, follow Shopify and fix
> the line in the same PR (this file is NOT append-only — it converges).
> 
> Scope note: 1:1 parity applies to the **admin** and the **checkout**. The
> storefront's *design* is ours (AI builder replaces themes — Deviation #2);
> its *behavior* (cart, PDP mechanics, speed) still has to feel like a
> first-class Shopify store.
> 
> ---
> 
> ## Global chrome (A3)
> 
> - To
> … [truncated, 10,124 more chars]
> ```

🔧 **Bash**
```
for f in admin-shell product-form customer-form collection-detail dashboard index-tables home capture; do
  echo "───── docs/parity/$f.md"
  git show origin/main:docs/parity/$f.md | wc -l | tr -d ' ' | sed 's/^/  lines: /'
  git show origin/main:docs/parity/$f.md | grep -nE '^#{2,3} ' | sed 's/^/  /'
done
```

> **↳ result**
> ```
> ───── docs/parity/admin-shell.md
>   lines: 107
>   6:## Top bar
>   27:## Navigation
>   75:### What this means for us
>   83:## Page header
>   98:## Contextual save bar
>   103:## Footer line
> ───── docs/parity/product-form.md
>   lines: 137
>   8:## Page chrome
>   18:## Contextual save bar
>   34:## Left column — card order
>   83:## Right rail — card order
>   102:## Delta vs our build
> ───── docs/parity/customer-form.md
>   lines: 59
>   5:## Page chrome
>   10:## Left column
>   35:## Right rail
>   44:## Delta vs our build
> ───── docs/parity/collection-detail.md
>   lines: 70
>   7:## Page chrome
>   13:## Left column
>   34:## Right rail
>   42:## Skeletons
>   54:## Delta vs our build
> ───── docs/parity/dashboard.md
>   lines: 144
> … [truncated, 1,118 more chars]
> ```

🔧 **Bash**
```
for f in admin-shell product-form customer-form collection-detail dashboard index-tables home; do
  echo "══════ $f.md"
  git show origin/main:docs/parity/$f.md | sed -n '/^## Delta vs our build/,$p'
  echo
done
```

> **↳ result**
> ```
> ══════ admin-shell.md
> 
> ══════ product-form.md
> ## Delta vs our build
> 
> Diffed against `apps/admin/src/app/store/[slug]/products/_components/product-form.tsx`
> at capture time. Ranked by how much each costs us on the KPI.
> 
> 1. **Price and Inventory belong in the LEFT column as their own cards.** We currently
>    fold pricing and stock into `VariantsCard`. Real Shopify shows Price and Inventory as
>    top-level left-column cards *above* Variants, and only moves per-variant pricing into
>    the variants table once options exist. This is the biggest structural difference on
>    the page. — *worth fixing*
> 2. **Card order.** Ours is Title/Description → Media → Variants. Shopify's is
>    Title/Description →
> … [truncated, 6,668 more chars]
> ```

🔧 **Bash**
```
git show origin/main:docs/parity/admin-shell.md | sed -n '75,107p'
```

> **↳ result**
> ```
> ### What this means for us
> 
> Our nav registry (`apps/admin/src/navigation/`) should match the top-level order and,
> where we build the feature, the sub-item order. Items behind SPEC.md §2 (Markets,
> Finance, Growth, Purchase orders, Transfers, Gift cards, Companies, Agentic) should be
> **absent, not disabled** — CLAUDE.md §8: a cut feature's UI element either works or is
> not rendered.
> 
> ## Page header
> 
> - Small area icon, then a `›` chevron, then the page title. On index pages the icon +
>   title only (`⊘ Products`, `⊟ Orders`, `⊘ Collections`, `☺ Customers`).
> - Title is large but not huge — roughly 20px, semibold.
> - Actions sit **right-aligned on the title row**:
>   - Products index: no actions whe
> … [truncated, 913 more chars]
> ```

🔧 **Bash**
```
git show origin/main:docs/parity/capture.md | sed -n '/^## Priority queue/,$p'; echo "=== H4 head ==="; git show origin/main:docs/issues/H4-ux-motion-parity.md | head -25
```

> **↳ result**
> ```
> ## Priority queue
> 
> In order of value to the KPI:
> 
> 1. **Order detail** — the most complex page in the admin, entirely uncaptured
> 2. **Populated Orders index** — columns, status badges, sort, filter chips, pagination
> 3. **Populated Products index** — same
> 4. **Populated Home dashboard** — replaces [home.md](home.md)
> 5. Populated Customers index, and customer detail
> 6. Discount create/edit forms
> 7. Settings pages
> 
> ## Adding a page
> 
> Create `docs/parity/<page>.md` following the existing shape — **Source** (URL, viewport,
> confidence) → **Layout** (card order, top to bottom, both columns) → **Copy** (verbatim
> strings in backticks) → **Delta vs our build** (diffed against our code, ranked, each
> tagg
> … [truncated, 1,199 more chars]
> ```

### 🤖 Claude

Here's what landed on `main` (commits #93 and #95 — a new `docs/parity/` folder captured from the real Shopify admin, plus the older `docs/issues/PARITY.md`).

## The parity reference folder — `docs/parity/`

Read [README.md](docs/parity/README.md) first: it states the capture conditions (2026‑08‑29, live admin, **brand-new empty store**), and that this folder overrides anyone's recollection of "what Shopify looks like."

Seven files carry work. Each ends with a ranked **"Delta vs our build"** already diffed against our code:

| # | File | Actionable deltas | Flavor |
|---|---|---|---|
| 1 | [product-form.md](docs/parity/product-form.md) | **9** | Biggest structural gap: Price + Inventory should be their own left-column cards above Variants; missing Collections in organization; missing Search engine listing card; the collapsed-pill pattern (Compare-at/SKU/Barcode) |
| 2 | [dashboard.md](docs/parity/dashboard.md) | **6** | Date-range + comparison pills above cards (full popover documented); metric tile layout; two-series chart with dotted comparison line; breakdown list card |
| 3 | [customer-form.md](docs/parity/customer-form.md) | **5** | First/Last name side by side; marketing-consent checkbox + grey footer strip; address as `⊕ Add address` row; Notes/Tags as right-rail cards |
| 4 | [collection-detail.md](docs/parity/collection-detail.md) | **6** | Inline-editable title/description over an image drop zone; count badge; `Add condition`/`Add products` bordered group; skeleton scope |
| 5 | [index-tables.md](docs/parity/index-tables.md) | **5** | Three kinds of empty state (esp. Kind C for filtered-to-zero); `Learn more about <resource>` footer link; bulk actions in the header row |
| 6 | [admin-shell.md](docs/parity/admin-shell.md) | ~4 (in "What this means for us" + sections) | Nav items behind SPEC §2 absent not disabled; page header icon + `›` breadcrumb; no blue primary anywhere — dark/near-black; save bar covers the top bar rather than pushing content |
| 7 | [home.md](docs/parity/home.md) | **0 — deliberately** | ⚠️ Flagged as a trap: it captured *onboarding* Home, not the dashboard. Build Home from `dashboard.md` instead |

Plus [capture.md](docs/parity/capture.md) — not work itself, it's the method for capturing more, and a priority queue of what's still **uncaptured** (order detail, populated Orders/Products/Customers indexes, the real Home dashboard). Those need a store with data.

## The two other parity files

- [docs/issues/PARITY.md](docs/issues/PARITY.md) — the older shared-memory doc written from recollection. Now partly superseded by `docs/parity/`; where they disagree, the captured folder wins.
- [docs/issues/H4-ux-motion-parity.md](docs/issues/H4-ux-motion-parity.md) — a separate backlog issue for *motion* parity (transitions, save-bar slide, popover timing), not static layout.

## Suggested order

By KPI value and independence, I'd go **product-form → dashboard → index-tables → customer-form → collection-detail → admin-shell**. Product form has the most deltas and the highest-traffic page; dashboard is what a demo opens on. Admin-shell last since its changes are cross-cutting and rebase badly against the others.

Which one do you want to start with?
