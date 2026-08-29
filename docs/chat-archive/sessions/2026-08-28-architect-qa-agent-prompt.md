# Architect/QA agent prompt

| | |
|---|---|
| **Session** | `a4d9e233-8cbc-43ea-9fbe-c236af7e08eb` |
| **Started** | 2026-08-28T13:59:49.055Z |
| **Ended** | 2026-08-28T15:27:08.267Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Pull request** | #68 (MERGED) |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

i want a architect/qa agent to take a look at my repo. what is a good prompt. this is sth i came up with but i know it can be improved. go full elite prompt engineer mode with the best result. consider the goal and kpi of this project. give me a better prompt than my one

"you are a super architect manager developer. there is a lot of ongoing parallel work in this repo. take a look at it. are the completed issues any good? do you see problems? if they are fixable by you, do it.

what would you improve? change? how is it going overall

keep in mind the KPI and nature of the project"

### 🤖 Claude

I'll ground the prompt in what's actually in your repo first.

🔧 **Bash**
```
ls && echo "--- docs ---" && ls docs && echo "--- issues ---" && ls docs/issues | head -60 && echo "--- issue count ---" && ls docs/issues | wc -l
```

🔧 **Bash**
```
echo "=== AGENT-LOG (head 80) ===" && head -80 docs/AGENT-LOG.md 2>/dev/null && echo "=== DECISIONS tail 30 ===" && tail -30 DECISIONS.md 2>/dev/null && echo "=== recent merges ===" && git log --oneline -25
```

> **↳ result**
> ```
> CLAUDE.md
> DECISIONS.md
> README.md
> SPEC.md
> apps
> biome.json
> docker-compose.yml
> docs
> e2e
> node_modules
> package.json
> packages
> pnpm-lock.yaml
> pnpm-workspace.yaml
> scripts
> tsconfig.base.json
> turbo.json
> --- docs ---
> AGENT-LOG.md
> PARALLEL-AGENTS.md
> WORKSTREAMS.md
> issues
> --- issues ---
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
> D2-proces
> … [truncated, 487 more chars]
> ```

> **↳ result**
> ```
> <persisted-output>
> Output too large (35.3KB). Full output saved to: /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/a4d9e233-8cbc-43ea-9fbe-c236af7e08eb/tool-results/bnu5z206x.txt
> 
> Preview (first 2KB):
> === AGENT-LOG (head 80) ===
> # Agent log
> 
> Append-only scratch log for cross-agent visibility. `merge=union`: append at the
> bottom, never edit existing lines.
> 
> Use it for things that are useful to another agent *right now* but are not
> decisions (which belong in `DECISIONS.md`): what you are actively working on,
> what you stubbed and where, what is temporarily broken on `main`.
> 
> Format: `YYYY-MM-DD HH:MM | WS-X | message`
> 
> ---
> 2026-08-28 11:35 | WS-A | Branch rule
> … [truncated, 1,414 more chars]
> ```

🔧 **Bash**
```
echo "=== issues/README ===" && cat docs/issues/README.md | head -80 && echo "=== INDEX head 60 ===" && head -60 docs/issues/INDEX.md
```

> **↳ result**
> ```
> === issues/README ===
> # Issue backlog — how the agent swarm works
> 
> This directory is the development plan, broken into parallel-safe issues.
> Each `NN-ws{x}-*.md` file is one unit of work an agent picks up, finishes, and
> lands as **one PR**. Everything an agent needs is in the issue file plus the
> canon documents: [SPEC.md](../../SPEC.md) (what to build),
> [CLAUDE.md](../../CLAUDE.md) (how to work), [WORKSTREAMS.md](../WORKSTREAMS.md)
> (what you own), and for anything with a screen, [PARITY.md](PARITY.md)
> (what Shopify actually looks like — binding for UI issues).
> 
> **KPI reminder: a Shopify user opens the admin and cannot tell it isn't
> Shopify.** Every issue exists to serve that. Trade-offs reso
> … [truncated, 7,565 more chars]
> ```

🔧 **Bash**
```
echo "=== AGENT-LOG tail 40 ===" && tail -40 docs/AGENT-LOG.md && echo "=== branches ===" && git branch -a | head -40 && echo "=== open PRs ===" && gh pr list --state open --limit 30 2>/dev/null
```

> **↳ result**
> ```
> === AGENT-LOG tail 40 ===
> 2026-08-28T19:30Z | WS-B | WS-H (H2): stable selectors for smoke flow (a) — the title field is `name="title"`, the description `name="description"`, and the save action is the Polaris ContextualSaveBar's "Save" button. The index's primary action is "Add product"; a row navigates on click.
> 2026-08-28T20:15Z | WS-B | VERIFIED B5 in a real browser (index, form, option builder, save, toast). HOW TO SEE THE ADMIN, since this cost me an hour: the browser pane only loads `_next/static/*` for the origin of a REGISTERED preview server. `preview_start {name:'dev'}` registers `localhost:3000` — so you must browse `http://localhost:3000`, NOT `http://admin.lvh.me:3000`, or ever
> … [truncated, 14,714 more chars]
> ```

### 🤖 Claude

I read your backlog, `AGENT-LOG.md`, `DECISIONS.md`, the merge history and open PRs so the prompt points at your actual failure surface rather than generic "review my repo" boilerplate.

**What's weak in your version:** it's polite and open-ended, so you'll get a code-reading essay. Three specific gaps: (1) your KPI is *visual*, so any review that never opens the admin in a browser cannot measure the thing you care about; (2) `AGENT-LOG.md` is full of `DONE X` claims — an auditor that trusts them audits nothing; (3) with 10 agents in flight, the bugs live in the **seams** between workstreams, which is exactly where no single agent's tests look. Plus "fix it if you can" with no landing protocol invites a commit to `main`.

Here's the replacement:

````text
ROLE

You are the staff engineer and release manager for Project Northstar: a two-day,
~10-agent parallel build of a multi-tenant Shopify clone ("Merchant"). You wrote
none of this code. Ten agents have been landing PRs into `main` all day, each
seeing only its own workstream. Nobody has yet looked at the whole thing as one
product. That is your job.

Read before you judge anything, in this order:
  CLAUDE.md · SPEC.md (§2 scope, §5 conventions, §14 tests, §15 security cap, §16
  workstreams) · docs/issues/INDEX.md · docs/issues/PARITY.md · DECISIONS.md ·
  docs/AGENT-LOG.md in full · git log on main · `gh pr list --state all --limit 60`

THE STANDARD

KPI: a Shopify user opens our admin and cannot tell it isn't Shopify.
Trade-offs resolve in this order, always: appearance parity → functionality →
performance → everything else (including security beyond the §15 baseline).

Every finding you report must be justified against that ordering, and ranked by
one question: *what does a person watching the demo see?* A clean abstraction
that changes nothing on screen is not a finding — it is noise, and reporting it
costs me the attention I need for the things that are.

EVIDENCE RULES — this is the part that makes or breaks the review

Nothing in this repo is true because someone wrote that it is true. Grade every
claim you make, and every claim you inherit, into exactly one tier:

  VERIFIED  — you ran it and saw the result (page rendered, request returned,
              test went green, row came back). Quote the actual output.
  READ      — you read the code and traced it, but did not execute it.
  CLAIMED   — an AGENT-LOG line, an issue's checkbox, or a PR description says so.

"DONE B5 | PR #50" in AGENT-LOG.md is CLAIMED, nothing more. Agents wrote those
lines about their own work, at the moment they stopped working on it, before six
other PRs landed on top. Treat the log as a set of hypotheses to test, and
specifically as a map of where to *look* — the seams an agent felt the need to
explain in prose are the seams most likely to be broken now.

A report whose headline findings are all READ is a failed review. Go run things.

PASS 1 — OPEN THE APP (do this before you read any application code)

The KPI is visual. You cannot assess it from a text editor.

  cp .env.example .env ; docker compose up -d ; pnpm install ; pnpm setup:git
  pnpm db:setup
  preview_start { name: "dev-localhost" }     # NOT "dev" — see CLAUDE.md §1:
                                              # the in-app browser only renders
                                              # localhost origins; lvh.me pages
                                              # load unstyled and never hydrate
First admin compile is ~4 min; the first navigate may 404 — reload once warm.
Log in as owner@demo.dev / password123 and walk the whole admin like a merchant
who has used Shopify for five years:

  Home · Orders (index → detail → fulfill → refund) · Products (index → form →
  variants → media) · Collections · Inventory · Customers · Discounts ·
  Analytics · Storefront/theme builder (chat → preset → preview → publish) ·
  Settings (general, staff, shipping, taxes, checkout, payments) · Apps

Then the storefront and checkout on the same seed data: browse → product →
cart → checkout → pay → confirmation, plus a customer account.

For every page, hold it against docs/issues/PARITY.md and against Polaris idiom
(§7). Screenshot anything wrong. Specifically hunt for:
  - dead ends: nav items or buttons that 404, no-op, or render an empty shell
  - the eight-interpretations problem: pages built by different agents that
    disagree on table density, tab sets, filter placement, empty states, toast
    copy, skeletons, or where the primary action sits
  - placeholder or leftover scaffolding still reachable (A3 shipped stand-in
    detail pages under /store/{slug}/{products,orders,customers}/[id] that
    B5/C5/C6 were told to REPLACE — confirm they did, don't assume)
  - forms that dirty without a contextual save bar, or save without a toast
  - anything that says "Shopify" or renders their logo — the brand string is
    "Merchant" and a leak here is instantly disqualifying
  - seed data that reads as fake: lorem, picsum, $0.00, "Test Product", empty
    charts. The seed IS the demo (§8).

Console errors, hydration warnings and failed requests count as parity defects
here, not just hygiene — read_console_messages and read_network_requests as you go.

PASS 2 — THE SEAMS

Parallel agents produce correct components and broken integrations, because each
one's tests only cover its own side of the boundary. This is where the real bugs
are. Work outward from the contract:

  1. packages/contracts is the integration contract. Find every type where the
     producer and the consumer disagree, where a field is declared and never
     populated, or where two workstreams built to two different vintages of the
     same schema.
  2. Find the dead seams: functions with an empty body, a hardcoded null, a
     silent no-op, or a "wire this up later" that no one came back to. WS-G
     already found one (services/orders/notify.ts was an empty body, so no
     webhook and no confirmation email ever fired, and nothing failed). Assume
     there are more. Grep for stub patterns, then verify each seam actually
     fires end to end against the running stack.
  3. Check every stub-and-move-on noted in DECISIONS.md and AGENT-LOG.md against
     current main: was it paid off, or is it still load-bearing?
  4. Non-negotiables sweep (§5, §6, §9) — these are cross-cutting so no single
     agent owns them:
       · floats or toFixed anywhere in money math, incl. seed and tests
       · raw prisma client in a request handler instead of dbForShop
       · nested create under dbForShop without an explicit shopId
       · raw inventoryLevel.update bypassing the adjustment service
       · error shapes that aren't { errors: [{ code, message, field? }] }
       · list endpoints with a UI search box but no ?query=, or offset paging
       · a PAN reachable by the checkout server, or in any log
       · a decline cascading to the next processor in Pay routing
  5. Run the mandatory blocking suites yourself and report real output:
     `pnpm verify`, the tenancy suite, packages/pay tests, discount math tests,
     and `pnpm e2e`. If e2e can't run, say exactly why — that itself is a finding.

Leads already visible in the log — confirm or kill each one, with evidence:
  a. Refunding a SEEDED order was reported to fail with `conflict: Unknown
     transaction mock_ch_…` because the mock processor's ledger is in-memory.
     e2e wouldn't catch it; a human clicking Refund in the demo would. Is it fixed?
  b. Order confirmation emails were reported to always send orderStatusUrl=null,
     so the email ships without its button. Still true?
  c. Checkout's findOrCreateCustomer maintains ordersCount/totalSpent and WS-C
     was asked to take those over. Did anyone? If both or neither maintain them,
     the customers index sorts on a wrong column.
  d. The theme builder preview depended on E2 storefront pages existing. Does the
     preview show a real themed page today, or a placeholder?
  e. `{ config: { rateLimit } }` silently ignores `windowMs` (the plugin wants
     `timeWindow`). Sweep every rate-limited route for that footgun.

PASS 3 — DID THE COMPLETED ISSUES ACTUALLY COMPLETE?

For each issue in docs/issues/ marked DONE in AGENT-LOG.md, open the issue file,
read its acceptance criteria and test plan, and check them against main — not
against the PR description. Produce a per-issue verdict:

  SOLID  — meets acceptance, verified running
  THIN   — nominally done, but a criterion is unmet, untested, or only skin-deep
  BROKEN — regressed or never worked outside its author's branch

Also report what is NOT claimed: which issues are unstarted, which are blocked,
which claims are stale (>3h, no PR), and whether the remaining work is actually
reachable in the time left. Note anything in-flight (open PRs, unmerged
ws-* branches) that will collide with what you find.

FIX POLICY

Fix, yourself, anything that is (i) demo-visible or KPI-relevant, (ii) small and
contained, and (iii) not inside another agent's in-flight branch. Concretely:
parity defects, dead seams, contract drift, broken flows, missing empty/loading
states, seed realism. Prefer five landed fixes over a fifty-item report.

Land every fix the project's way (CLAUDE.md §4): branch off fresh main, name it
`ws-qa/short-description`, Conventional Commit `fix(ws-qa): …`, `gh pr create
--fill`, `gh pr merge --auto --squash --delete-branch`. Never commit to main.
Never force-push. Small, coherent PRs — one theme each, not one mega-PR. Run
`pnpm verify` before every push. If CI goes red, fix it; never weaken a check or
skip a test to get green.

For anything too large, too risky, or owned by an agent mid-flight: write it up
as a new issue file in docs/issues/ following the existing format (You own /
Depends on / Acceptance / Test plan), add it to INDEX.md, and append one line per
finding to docs/AGENT-LOG.md so the swarm sees it. Append, never edit existing lines.

DO NOT

  · relitigate anything already settled in DECISIONS.md
  · widen scope past SPEC §2 (no POS, multi-currency, gift cards, B2B, i18n,
    GraphQL, metafields UI, …) or past the §15 security baseline — no CSP tuning,
    helmet audits, SSRF filtering, key rotation. These are explicitly capped.
  · add tests SPEC §14 forbids: snapshots, per-endpoint CRUD, mock-heavy glue
    tests, coverage targets
  · refactor for taste, rename for consistency, or restructure directories
  · rebuild by hand what Polaris already ships (§7), or add CSS outside --p-* tokens
  · edit another workstream's app code for anything other than a bug you have
    reproduced and are fixing — and flag it in AGENT-LOG when you do
  · report a finding you have not traced to a specific file and line

DELIVERABLE

Write it to docs/REVIEW-<date>.md and give me the same thing in chat, in this order:

  1. VERDICT — 5 sentences. Is this demoable today? If someone ran the demo
     right now, where does it break first? Ship-readiness as a percentage of the
     KPI, and what the single highest-leverage next action is.
  2. DEMO BLOCKERS — anything a viewer would hit in the happy path. Each with:
     what you saw, file:line, evidence tier, screenshot if visual, fix status.
  3. PARITY GAP — where the admin reads as "not Shopify", ranked by how obvious.
     Include the cross-agent inconsistencies, which are the tell that eight
     people built this.
  4. SEAM & CORRECTNESS FINDINGS — ranked, same evidence discipline.
  5. ISSUE VERDICT TABLE — id | claimed | actual | evidence | note.
  6. LANDED — PRs you opened, one line each, with what they fix.
  7. FILED — new issue files, with a suggested grab order for the remaining time.
  8. WHAT I'D DO WITH THE NEXT SIX HOURS — a ranked plan, KPI-ordered, honest
     about what to cut. Cutting a feature cleanly (element not rendered at all)
     beats leaving it half-built (§8).

Lead with what is wrong. I do not need a summary of what works. Be blunt,
be specific, and if the honest verdict is
… [truncated, 791 more chars]

### 👤 User

too formal. it needs to tell me in chat. also main progress is ongoing. it is not near ready state. shorter. stop with jargon to the point

### 🤖 Claude

Shorter, plainer, mid-build framing, answers in chat:

````text
You're the lead engineer on Project Northstar. Ten agents have been landing PRs
into main all day, each only seeing its own slice. Nobody has looked at the whole
thing yet. That's you.

This is mid-build, not pre-launch. I don't want a readiness score. I want to know
what's broken, what's drifting apart, and what to do next.

Read first: CLAUDE.md, SPEC.md, docs/issues/INDEX.md, docs/issues/PARITY.md,
DECISIONS.md, all of docs/AGENT-LOG.md, git log on main, open PRs.

The only thing that matters: someone who uses Shopify daily opens our admin and
can't tell the difference. Rank everything by what a person actually sees.

--- Open the app before you read any code ---

The goal is visual, so you can't judge it from a text editor.

  cp .env.example .env; docker compose up -d; pnpm install; pnpm setup:git; pnpm db:setup
  preview_start { name: "dev-localhost" }   <- not "dev". The in-app browser only
  renders localhost; lvh.me loads unstyled and never hydrates. First compile ~4min.

Log in (owner@demo.dev / password123) and click through everything like a real
merchant: home, orders (detail, fulfill, refund), products, collections,
inventory, customers, discounts, analytics, theme builder, settings, apps. Then
the storefront and checkout end to end. Screenshot what's wrong.

Watch for: buttons and nav that go nowhere or land on an empty shell; leftover
placeholder pages; pages that clearly disagree with each other because different
agents built them (different table density, tabs, filters, empty states, toast
wording, where the main button sits); forms that go dirty with no save bar; seed
data that reads as fake; console errors and failed requests; the word "Shopify"
anywhere.

--- Then check the joins between workstreams ---

That's where the bugs are — each agent tested its own half. Look for types in
packages/contracts where the two sides disagree, fields declared but never
filled, and functions with an empty body or a hardcoded null that someone meant
to come back to. WS-G already found one: order notifications was an empty
function, so no webhook or email ever fired and nothing errored. There are more.

Also sweep the rules that nobody owns: floats in money math, raw prisma instead
of dbForShop, nested creates missing shopId, inventory written directly instead
of through the adjustment service, wrong error shape, a card decline falling
through to the next processor.

Run the real suites and paste the actual output: pnpm verify, tenancy tests, pay
tests, discount math, pnpm e2e.

Specific things in the log worth confirming or killing:
 - refunding a seeded order reportedly dies with "unknown transaction mock_ch_…"
 - order emails reportedly always send with a null status url, so no button
 - checkout and the customers service may both (or neither) maintain
   ordersCount/totalSpent
 - does the theme builder preview show a real page yet, or a placeholder?

--- Trust nothing that's only written down ---

"DONE B5 | PR #50" means an agent said so about its own work before six other PRs
landed on top. For each issue marked done, open the issue file, read what it was
supposed to deliver, and check main. Tell me: actually solid / only skin deep /
broken. Also what's unstarted, what's stale, and what's about to collide.

When you tell me something, say whether you ran it or just read it. If most of
your findings are just-read, you didn't do the review.

--- Fix what you can ---

Anything small, visible, and not inside a branch someone's currently working in:
just fix it. Five landed fixes beat a fifty-item list. Land it the normal way —
branch off main, ws-qa/whatever, conventional commit, gh pr create --fill, auto
merge. Never commit to main, never weaken a test to get CI green. Too big or
someone else's live work: write it up as a new issue in docs/issues/ and append a
line to AGENT-LOG.md.

Don't reopen anything in DECISIONS.md. Don't add scope SPEC §2 rules out. Don't
add security work past the §15 baseline. Don't write the tests §14 forbids. Don't
refactor or rename for taste.

--- Tell me in chat ---

No report file. Just talk to me, worst thing first:

 - what breaks if I click around right now
 - where the admin stops looking like Shopify, especially where agents
   contradict each other
 - what's broken between workstreams
 - which "done" issues aren't
 - what you fixed and pushed
 - what you'd do with the next six hours, ranked, honest about what to cut

Lead with problems. Skip the summary of what works. If it's in worse shape than
the log makes it sound, say that plainly.
````

### 👤 User

create a skill for this. this is codebase review skill. add it to the repo

🔧 **Bash**
```
ls -R .claude 2>/dev/null | head -40 && echo "=== critical-review ===" && cat .claude/skills/critical-review/SKILL.md 2>/dev/null | head -60
```

> **↳ result**
> ```
> hooks
> launch.json
> settings.json
> skills
> worktrees
> 
> .claude/hooks:
> guard-git.sh
> 
> .claude/skills:
> resolve-issue
> 
> .claude/skills/resolve-issue:
> SKILL.md
> 
> .claude/worktrees:
> a5-deps-readiness-29b49e
> agent-swarm-dev-plan-ee07d4
> e5-issue-deps-571a87
> find-available-issue-a2501f
> h2-issue-completion-2d6711
> issue-c1-4553b1
> local-dev-setup-8cdd6a
> repo-architecture-review-d669c1
> repo-init-agent-setup-01f7ee
> repo-ui-issues-status-afad25
> resolve-docs-issue-3f28ad
> resolve-docs-issue-9ed006
> resolve-docs-issue-b00d6b
> resolve-docs-issue-b8786f
> resolve-docs-issue-c8efa9
> workstream-b-critical-review-1fb97e
> ws-b-collections-inventory-ui
> 
> .claude/worktrees/a5-deps-readiness-29b49e:
> CLAUDE.md
> DECISIONS.md
> README.md
> … [truncated, 37 more chars]
> ```

🔧 **Bash**
```
ls ~/.claude/skills 2>/dev/null; echo "---"; sed -n 1,40p ~/.claude/skills/critical-review/SKILL.md 2>/dev/null; echo "=== resolve-issue ==="; wc -l .claude/skills/resolve-issue/SKILL.md; sed -n 1,45p .claude/skills/resolve-issue/SKILL.md
```

> **↳ result**
> ```
> critical-review
> ---
> ---
> name: critical-review
> description: Run a thorough, adversarial code audit of a scope (a workstream, module, directory, feature, or PR) and report severity-ranked findings directly in chat. Use this whenever the user asks for a code review, audit, quality check, or "look over" of existing code — especially phrasings like "review workstream X", "audit the payments module", "be critical", "find what's wrong with", or "is this code solid?" — even if they don't say the word "review". Do not use it for reviewing prose/docs or for writing new code.
> ---
> 
> # Critical code review
> 
> Perform an independent, adversarial audit of the scope the user named, and deliver the full report
> … [truncated, 7,294 more chars]
> ```

### 🤖 Claude

Existing `critical-review` is a scoped module audit that lives in your user dir; this one is different enough to earn its own name and to live in the repo. Writing it as `repo-review`.

🔧 **Bash**
```
git checkout main -q && git pull -q --ff-only 2>&1 | tail -2; git checkout -q -b ws-qa/repo-review-skill && mkdir -p .claude/skills/repo-review && git branch --show-current
```

> **↳ result**
> ```
> ws-qa/repo-review-skill
> ```

🔧 **Bash**
```
cat > .claude/skills/repo-review/SKILL.md <<'SKILL_EOF'
---
name: repo-review
description: Whole-repo health check of the parallel build — click through the running app, verify what the swarm claims is done, find what is broken between workstreams, fix the small stuff, and report it all in chat. Use when asked "how is it going", "look at the repo", "are the completed issues any good", "what would you improve", or for any review whose scope is the project rather than one module. For a deep audit of ONE workstream, module or PR, use critical-review instead.
---

# Reviewing the whole repo

Ten a
… [truncated, 6,767 more chars]
```

> **↳ result**
> ```
> 141 .claude/skills/repo-review/SKILL.md
> ```

### 🤖 Claude

Skill's already live in this session. For *new* agents, two things matter: it has to be on `main` (`.claude/` is committed, so every worktree gets it), and it has to be discoverable from `CLAUDE.md` §1, which is where agents onboard.

🔧 **Bash**
```
grep -n "Agent tooling" -A 3 CLAUDE.md
```

> **↳ result**
> ```
> 50:**Agent tooling** (`.claude/`, committed — it applies to every worktree):
> 51-
> 52-- **See the app.** `.claude/launch.json` defines the preview targets, so Claude Code can boot the stack and drive it in a browser: start `dev` (runs `pnpm dev`, i.e. all four apps), then attach a target. The admin's *first* compile takes ~4 min, so the initial navigate can 404 — reload once it is warm. Pixel-parity work (§7) should be checked this way, not by asking a human to look.
> 53-  - **The in-app browser only renders `localhost` origins.** It loads the HTML of an `*.lvh.me` page but blocks every subresource (`ERR_BLOCKED_BY_CLIENT`), so the admin and storefront come up unstyled and never hydrate — which
> … [truncated, 154 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import re
p = "CLAUDE.md"
s = open(p).read()
anchor = "**Agent tooling** (`.claude/`, committed — it applies to every worktree):\n\n"
add = anchor + "- **Skills.** `.claude/skills/` ships two workflows every agent gets automatically: `resolve-issue` (take one issue from `docs/issues/` and land it as a merged PR) and `repo-review` (whole-repo health check — browse the running app, verify what the swarm *claims* is done, find what broke between workstreams). Invoke by name, or just describe the task and let it trigger.\n"
assert s.count(anchor) == 1
open(p, "w").write(s.replace(
… [truncated, 40 more chars]
```

> **↳ result**
> ```
> **Agent tooling** (`.claude/`, committed — it applies to every worktree):
> 
> - **Skills.** `.claude/skills/` ships two workflows every agent gets automatically: `resolve-issue` (take one issue from `docs/issues/` and land it as a merged PR) and `repo-review` (whole-repo health check — browse the running app, verify what the swarm *claims* is done, find what broke between workstreams). Invoke by name, or just describe the task and let it trigger.
> - **See the app.** `.claude/launch.json` defines the preview targets, so Claude Code can boot the stack and drive it in a browser: start `dev` (runs `pnpm dev`, i.e. all four apps), then attach a target. The admin's *first* compile takes ~4 min, so the
> … [truncated, 133 more chars]
> ```

🔧 **Bash**
```
git add .claude/skills/repo-review/SKILL.md CLAUDE.md && git commit -q -m "$(cat <<'EOF'
docs(root): repo-review skill — the whole-repo pass nobody was doing

Ten agents land PRs all day, each seeing one slice. This is the review of
the seams: browse the running app first (parity is visual, so it cannot be
judged from an editor), treat every DONE in AGENT-LOG as a claim to test
rather than a fact, hunt the dead seams between workstreams, fix what is
small and land the rest as issues. Reports in chat, worst thing first.

Also lists both committed skills in CLAUDE.md §1 so new agents find them.
… [truncated, 161 more chars]
```

> **↳ result**
> ```
> Checked 0 files in 114ms. No fixes applied.
> remote: Create a pull request for 'ws-qa/repo-review-skill' on GitHub by visiting:        
> remote:      https://github.com/pauljurgens11/shopify/pull/new/ws-qa/repo-review-skill        
> remote: 
> aborted: you must first push the current branch to a remote, or use the --head flag
> ```

🔧 **Bash**
```
git push -u origin ws-qa/repo-review-skill 2>&1 | tail -2; gh pr create --fill 2>&1 | tail -2
```

> **↳ result**
> ```
> Everything up-to-date
> branch 'ws-qa/repo-review-skill' set up to track 'origin/ws-qa/repo-review-skill' by rebasing.
> head branch "main" is the same as base branch "main", cannot create a pull request
> ```

🔧 **Bash**
```
gh pr create --fill --head ws-qa/repo-review-skill --base main 2>&1 | tail -3
```

> **↳ result**
> ```
> could not compute title or body defaults: could not find any commits between origin/main and ws-qa/repo-review-skill
> ```

🔧 **Bash**
```
git log --oneline -3 && echo "--- remote branch ---" && git ls-remote --heads origin ws-qa/repo-review-skill && echo "--- diff vs origin/main ---" && git fetch -q origin && git log --oneline origin/main..HEAD
```

> **↳ result**
> ```
> 73a445b fix(ws-b): stop product saves wiping variant fields, survive option renames, un-strand Locations [contracts] (#66)
> 0b7335a feat(ws-g): private apps, the public Admin REST API, and the webhooks UI (#62)
> 6e63f93 docs(root): make resolve-issue match the brief it was written from (#65)
> --- remote branch ---
> 73a445b6dae2f15a5ef21a154bc246b7072aa9e0	refs/heads/ws-qa/repo-review-skill
> --- diff vs origin/main ---
> ```

🔧 **Bash**
```
git status --short | head; echo "--- file exists? ---"; ls -la .claude/skills/repo-review/ 2>&1; echo "--- reflog ---"; git reflog -12
```

> **↳ result**
> ```
> --- file exists? ---
> ls: .claude/skills/repo-review/: No such file or directory
> --- reflog ---
> 73a445b HEAD@{0}: checkout: moving from ws-root/critical-review-skill to main
> e5c45c8 HEAD@{1}: commit: docs(root): repo-review skill — the whole-repo pass nobody was doing
> 2c6780a HEAD@{2}: commit: docs(root): critical-review skill — adversarial per-scope audit
> 73a445b HEAD@{3}: checkout: moving from main to ws-root/critical-review-skill
> 73a445b HEAD@{4}: checkout: moving from ws-qa/repo-review-skill to main
> 73a445b HEAD@{5}: checkout: moving from main to ws-qa/repo-review-skill
> 73a445b HEAD@{6}: pull -q --ff-only: Fast-forward
> fcc1b04 HEAD@{7}: checkout: moving from main to main
> fcc1b04 HEAD@{8}:
> … [truncated, 300 more chars]
> ```

### 🤖 Claude

Something concurrent is operating in this same checkout — it switched my branch out from under me and swept my commit onto its own branch. Recovering:

🔧 **Bash**
```
git ls-remote --heads origin 'ws-root/*' 'ws-qa/*'; echo "--- open PRs ---"; gh pr list --state open --limit 10 2>/dev/null; echo "--- local branch tips ---"; git log --oneline -2 ws-root/critical-review-skill 2>/dev/null
```

> **↳ result**
> ```
> 73a445b6dae2f15a5ef21a154bc246b7072aa9e0	refs/heads/ws-qa/repo-review-skill
> 06c646c20644d8e7755cfe16ff62bb844c3cd166	refs/heads/ws-root/agent-tooling
> 2c6780a1eca2f86ef953c4246d798d3672f99bcc	refs/heads/ws-root/critical-review-skill
> ff8e77451cbbc0f38f66345b73505f39db31939a	refs/heads/ws-root/pr-health
> e99939be1f33c63869f8eb8a8bb320683f70506d	refs/heads/ws-root/pr-rebase-guard
> --- open PRs ---
> 67	docs(root): critical-review skill — adversarial per-scope audit	ws-root/critical-review-skill	OPEN	2026-08-28T15:06:20Z
> --- local branch tips ---
> e5c45c8 docs(root): repo-review skill — the whole-repo pass nobody was doing
> 2c6780a docs(root): critical-review skill — adversarial per-scope audit
> ```

### 🤖 Claude

Recovered the situation: a parallel agent in this same checkout switched branches mid-flight and my commit landed on *its* branch (`ws-root/critical-review-skill`, now [PR #67](https://github.com/pauljurgens11/shopify/pull/67)) — but it hadn't pushed that commit, so it's cleanly separable.

🔧 **Bash**
```
git checkout -q ws-qa/repo-review-skill && git cherry-pick e5c45c8 -x 2>&1 | tail -2 && git branch -f ws-root/critical-review-skill 2c6780a && git log --oneline -1 && ls .claude/skills/
```

> **↳ result**
> ```
> 2 files changed, 142 insertions(+)
>  create mode 100644 .claude/skills/repo-review/SKILL.md
> 6f4757f docs(root): repo-review skill — the whole-repo pass nobody was doing
> repo-review
> resolve-issue
> ```

🔧 **Bash**
```
git push -u origin ws-qa/repo-review-skill 2>&1 | tail -2 && gh pr create --fill --head ws-qa/repo-review-skill --base main 2>&1 | tail -2
```

> **↳ result**
> ```
> 73a445b..6f4757f  ws-qa/repo-review-skill -> ws-qa/repo-review-skill
> branch 'ws-qa/repo-review-skill' set up to track 'origin/ws-qa/repo-review-skill' by rebasing.
> https://github.com/pauljurgens11/shopify/pull/68
> ```

🔧 **Bash**
```
gh pr merge 68 --auto --squash --delete-branch 2>&1 | tail -2
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

### 🤖 Claude

Done — [PR #68](https://github.com/pauljurgens11/shopify/pull/68), auto-merge armed.

**What landed** — [.claude/skills/repo-review/SKILL.md](.claude/skills/repo-review/SKILL.md), your prompt turned into a repeatable workflow. Five sections: open the app before reading code (with the `dev-localhost` trap spelled out), check the joins between workstreams, trust nothing that's only written down, fix what you can and land it properly, report in chat worst-thing-first. I kept the generic lessons and dropped your four one-off leads — those were specific to today's log; the skill instead teaches *how* to mine the log for leads ("where an agent wrote a paragraph explaining a seam, that seam is most likely broken now"), with the empty-`notify.ts` bug as the worked example of the shape.

**On accessibility for new agents** — three things, all needed:

- `.claude/` is committed, so once #68 merges every fresh clone and worktree gets it automatically. Agents on *existing* branches pick it up on their next rebase off `main`.
- Added a line to [CLAUDE.md:52](CLAUDE.md:52) under §1 Agent tooling listing both committed skills. That section is where agents onboard, and it previously documented `launch.json` and the guards but never mentioned that `.claude/skills/` existed at all — so `resolve-issue` was also effectively invisible to anyone who didn't stumble into it.
- The description is written to trigger on your actual phrasings ("how is it going", "are the completed issues any good", "what would you improve") and explicitly routes single-module audits to `critical-review` instead, so the two don't fight.

One thing you should know: `critical-review` lives in your `~/.claude/skills/`, not the repo — it follows *you*, not the checkout. A parallel agent is currently landing it into the repo as [PR #67](https://github.com/pauljurgens11/shopify/pull/67), which fixes that.

That agent and I collided, incidentally — it switched branches inside this shared checkout while I was committing, and my commit ended up on its branch. I cherry-picked mine onto `ws-qa/repo-review-skill` and reset its local branch back to exactly what it had already pushed, so #67 is untouched and contains only its own work.

### 👤 User

make sure that repo review and critical review are well distinguishable based on their function. and make sure the issue resolve is also there. and all of work in a similar way from claude perspective

🔧 **Bash**
```
git branch --show-current; ls .claude/skills/; echo "--- PRs ---"; gh pr list --state all --limit 6; echo "--- main tip ---"; git fetch -q origin && git log --oneline origin/main -3
```

> **↳ result**
> ```
> ws-qa/repo-review-skill
> repo-review
> resolve-issue
> --- PRs ---
> 68	docs(root): repo-review skill — the whole-repo pass nobody was doing	ws-qa/repo-review-skill	OPEN	2026-08-28T15:09:06Z
> 67	docs(root): critical-review skill — adversarial per-scope audit	ws-root/critical-review-skill	MERGED	2026-08-28T15:06:20Z
> 66	fix(ws-b): critical-review fixes — variant data loss, option renames, Locations page [contracts]	ws-b/critical-review-fixes	MERGED	2026-08-28T14:57:16Z
> 65	docs(root): resolve-issue — lead with test-driven, add the review step	ws-b/skill-tdd	MERGED	2026-08-28T14:51:54Z
> 64	fix(shared): order detail derives the customer's order count; Paid badge is subdued per PARITY	ws-qa/order-detail-de
> … [truncated, 497 more chars]
> ```

### 🤖 Claude

`critical-review` landed in the repo via #67. Rebasing onto it so I can harmonize all three.

🔧 **Bash**
```
git rebase origin/main 2>&1 | tail -2; ls .claude/skills/; echo "=== critical-review (repo) ==="; cat .claude/skills/critical-review/SKILL.md | sed -n 1,200p
```

> **↳ result**
> ```
> Rebasing (1/1)Successfully rebased and updated refs/heads/ws-qa/repo-review-skill.
> critical-review
> repo-review
> resolve-issue
> === critical-review (repo) ===
> ---
> name: critical-review
> description: Run a thorough, adversarial code audit of a scope (a workstream, module, directory, feature, or PR) and report severity-ranked findings directly in chat. Use this whenever the user asks for a code review, audit, quality check, or "look over" of existing code — especially phrasings like "review workstream X", "audit the payments module", "be critical", "find what's wrong with", or "is this code solid?" — even if they don't say the word "review". Do not use it for reviewing prose/docs or for writing n
> … [truncated, 6,807 more chars]
> ```

🔧 **Bash**
```
grep -n '^#\|^##\|^\*\*The bar' .claude/skills/resolve-issue/SKILL.md; echo "=== tail 45 ==="; tail -45 .claude/skills/resolve-issue/SKILL.md
```

> **↳ result**
> ```
> 6:# Resolving an issue
> 13:**The bar:** a merged PR whose behaviour you have *seen work*, not one that
> 24:## 1. Pick and claim
> 39:# append to docs/AGENT-LOG.md:  <ISO time> | WS-X | CLAIM {id} … | branch ws-{x}/{slug}
> 50:### Decide alone; escalate almost never
> 65:## 2. Read in this order — later sources lose
> 86:## 3. Test-driven — and only tests that earn their place
> 125:### Which tests earn their place
> 155:### Mutation-check the load-bearing assertions
> 166:### When a test fails, decide which side is wrong
> 173:## 4. Verify by running it
> 187:### Browser recipe
> 220:### Never fake completeness
> 227:## 5. Review your own diff before pushing
> 261:## 6. Scope: finish it, and stop
> 278:## 7. Land it
> 30
> … [truncated, 2,565 more chars]
> ```

### 🤖 Claude

Now I'll harmonize the three. The functional split I'm enforcing:

| skill | input | what it does | output |
|---|---|---|---|
| `resolve-issue` | one issue id | **builds** it | a merged PR |
| `critical-review` | one named scope | **audits it deep** — code quality, read-only | severity-ranked findings in chat |
| `repo-review` | nothing (the project) | **surveys the whole build** — browser-first, verifies claims, checks seams | chat + small fixes landed |

🔧 **Bash**
```
python3 - <<'PY'
import re, pathlib

# ---------- critical-review: new frontmatter + routing/bar header ----------
p = pathlib.Path(".claude/skills/critical-review/SKILL.md")
s = p.read_text()

new_fm = '''---
name: critical-review
description: Audit ONE named scope in depth — a workstream, module, directory, feature, branch or PR — and report severity-ranked findings in chat. Read-only: it finds and explains, it does not fix. Use for "review workstream D", "audit the payments module", "is this code solid?", "be critical about X", "look over this PR". If no scope is named and the subject is th
… [truncated, 2,720 more chars]
```

> **↳ result**
> ```
> critical-review: 88 lines
> ---
> name: critical-review
> description: Audit ONE named scope in depth — a workstream, module, directory, feature, branch or PR — and report severity-ranked findings in chat. Read-only: it finds and explains, it does not fix. Use for "review workstream D", "audit the payments module", "is this code solid?", "be critical about X", "look over this PR". If no scope is named and the subject is the project as a whole ("how is it going", "look at the repo"), use repo-review. To build an issue rather than judge one, use resolve-issue.
> ---
> 
> # Critical code review
> 
> Audit the one scope the user named, as deeply as you can, and deliver the findings
> in chat. You are a principal
> … [truncated, 771 more chars]
> ```

### 🤖 Claude

Now the same header shape on `repo-review`, plus its checklist:

🔧 **Bash**
```
python3 - <<'PY'
import re, pathlib
p = pathlib.Path(".claude/skills/repo-review/SKILL.md")
s = p.read_text()

new_head = '''---
name: repo-review
description: Survey the WHOLE build — drive the running app in a browser, verify what the swarm claims is done, find what broke between workstreams, fix the small stuff, report in chat. Use when no single scope is named: "how is it going", "look at the repo", "are the completed issues any good", "what would you improve", "is this demoable". For one named workstream, module or PR, use critical-review instead. To build an issue rather than judge one,
… [truncated, 2,077 more chars]
```

> **↳ result**
> ```
> 165 lines
> ---
> name: repo-review
> description: Survey the WHOLE build — drive the running app in a browser, verify what the swarm claims is done, find what broke between workstreams, fix the small stuff, report in chat. Use when no single scope is named: "how is it going", "look at the repo", "are the completed issues any good", "what would you improve", "is this demoable". For one named workstream, module or PR, use critical-review instead. To build an issue rather than judge one, use resolve-issue.
> ---
> 
> # Reviewing the whole repo
> 
> Ten agents land PRs into `main` all day, each only seeing its own slice. Nobody
> looks at the whole thing. That is this skill.
> ```

🔧 **Bash**
```
sed -n 1,16p .claude/skills/resolve-issue/SKILL.md
```

> **↳ result**
> ```
> ---
> name: resolve-issue
> description: Take one issue from docs/issues/ and land it as a merged PR. Use when picking up backlog work, when asked to "do C3" / "work on the next issue", or when resuming an issue already claimed in AGENT-LOG. Covers claiming, TDD that catches real bugs, verifying against the running stack, and the swarm/environment traps that cost hours. Applies to every workstream — API, admin, storefront, worker, pay, theme, seed.
> ---
> 
> # Resolving an issue
> 
> Read [CLAUDE.md](../../../CLAUDE.md), [SPEC.md](../../../SPEC.md) and
> [docs/issues/README.md](../../../docs/issues/README.md) first. This is the
> operating experience on top of them: the things that are not policy, and that
> c
> … [truncated, 212 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path(".claude/skills/resolve-issue/SKILL.md")
s = p.read_text()

old_desc = 'description: Take one issue from docs/issues/ and land it as a merged PR. Use when picking up backlog work, when asked to "do C3" / "work on the next issue", or when resuming an issue already claimed in AGENT-LOG. Covers claiming, TDD that catches real bugs, verifying against the running stack, and the swarm/environment traps that cost hours. Applies to every workstream — API, admin, storefront, worker, pay, theme, seed.'
new_desc = 'description: Build ONE issue from docs/is
… [truncated, 1,131 more chars]
```

> **↳ result**
> ```
> ok
> 
> **The bar:** a merged PR whose behaviour you have *seen work*, not one that
> compiles and has green tests.
> 
> **This skill vs the others:** `resolve-issue` *builds*.
> [`critical-review`](../critical-review/SKILL.md) audits one named scope in depth
> and only reports. [`repo-review`](../repo-review/SKILL.md) surveys the whole
> build, drives the app in a browser, and lands the small fixes itself.
> 
> **The tiebreaker, for every judgement call below:** the KPI — a Shopify user
> opens our admin and cannot tell it isn't Shopify. Resolve trade-offs in
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path("CLAUDE.md")
s = p.read_text()
old = "- **Skills.** `.claude/skills/` ships two workflows every agent gets automatically: `resolve-issue` (take one issue from `docs/issues/` and land it as a merged PR) and `repo-review` (whole-repo health check — browse the running app, verify what the swarm *claims* is done, find what broke between workstreams). Invoke by name, or just describe the task and let it trigger.\n"
new = ("- **Skills.** `.claude/skills/` ships three workflows every agent gets automatically. They split by *what you are doing*, not by
… [truncated, 616 more chars]
```

> **↳ result**
> ```
> ok
> === descriptions side by side ===
> --- .claude/skills/critical-review/SKILL.md
> description: Audit ONE named scope in depth — a workstream, module, directory, feature, branch or PR — and report severity-ranked findings in chat
> --- .claude/skills/repo-review/SKILL.md
> description: Survey the WHOLE build — drive the running app in a browser, verify what the swarm claims is done, find what broke between workstreams,
> --- .claude/skills/resolve-issue/SKILL.md
> description: Build ONE issue from docs/issues/ and land it as a merged PR. Use when picking up backlog work, when asked to "do C3" / "work on the next
> ```

🔧 **Bash**
```
head -6 .claude/skills/*/SKILL.md >/dev/null && python3 - <<'PY'
import pathlib,sys,re
for f in sorted(pathlib.Path(".claude/skills").glob("*/SKILL.md")):
    t=f.read_text(); L=t.splitlines()
    assert L[0]=="---" and L[1].startswith("name: ") and L[2].startswith("description: ") and L[3]=="---", f
    assert L[5].startswith("# "), f
    has_bar="**The bar:**" in t; has_vs="**This skill vs the others:**" in t; has_cl="\n## Checklist\n" in t
    print(f"{f.parent.name:18} bar={has_bar} routing={has_vs} checklist={has_cl} lines={len(L)}")
PY
echo "--- broken relative links? ---"; grep -oh '(\.
… [truncated, 171 more chars]
```

> **↳ result**
> ```
> critical-review    bar=True routing=True checklist=True lines=88
> repo-review        bar=True routing=True checklist=True lines=165
> resolve-issue      bar=True routing=True checklist=True lines=344
> --- broken relative links? ---
> OK  ../../../CLAUDE.md
> OK  ../../../DECISIONS.md
> OK  ../../../SPEC.md
> OK  ../../../docs/AGENT-LOG.md
> OK  ../../../docs/issues/INDEX.md
> OK  ../../../docs/issues/PARITY.md
> OK  ../../../docs/issues/README.md
> OK  ../critical-review/SKILL.md
> OK  ../repo-review/SKILL.md
> OK  ../resolve-issue/SKILL.md
> ```

### 🤖 Claude

All three validate: same frontmatter shape, same `# Title` → **The bar** → **This skill vs the others** → numbered sections → `## Checklist` spine, and every cross-link resolves. Committing:

🔧 **Bash**
```
git add -A .claude/skills CLAUDE.md && git commit -q -m "$(cat <<'EOF'
docs(root): make the three skills one set — build, audit, survey

They were written independently and overlapped on trigger words, so
"review the repo" could land in either review skill. Split them by what
you are DOING, and say so in each description and at the top of each file:

  resolve-issue    build ONE issue        -> a merged PR
  critical-review  audit ONE named scope  -> findings in chat, no fixes
  repo-review      survey the WHOLE build -> chat + small fixes landed

Same shape in all three now: bar, routing bloc
… [truncated, 477 more chars]
```

> **↳ result**
> ```
> Checked 0 files in 5ms. No fixes applied.
> remote: 
> dc2172f docs(root): make the three skills one set — build, audit, survey
> 0b0a1c1 docs(root): repo-review skill — the whole-repo pass nobody was doing
> MERGED / UNKNOWN
> ```

🔧 **Bash**
```
git fetch -q origin && git log --oneline origin/main -3 && echo "--- ahead of main ---" && git log --oneline origin/main..HEAD
```

> **↳ result**
> ```
> a7c1e28 docs(root): repo-review skill — the whole-repo pass nobody was doing (#68)
> ebffcb2 docs(root): critical-review skill — adversarial per-scope audit (#67)
> 73a445b fix(ws-b): stop product saves wiping variant fields, survive option renames, un-strand Locations [contracts] (#66)
> --- ahead of main ---
> dc2172f docs(root): make the three skills one set — build, audit, survey
> 0b0a1c1 docs(root): repo-review skill — the whole-repo pass nobody was doing
> ```

### 🤖 Claude

#68 merged while I worked. Rebasing the harmonization onto the new `main` and landing it separately:

🔧 **Bash**
```
git rebase origin/main 2>&1|tail -1 && git log --oneline origin/main..HEAD && git checkout -q -b ws-qa/skill-set-harmonize && git push -q -u origin ws-qa/skill-set-harmonize 2>&1|tail -1; gh pr create --fill --head ws-qa/skill-set-harmonize --base main 2>&1|tail -1
```

> **↳ result**
> ```
> Rebasing (1/1)Successfully rebased and updated refs/heads/ws-qa/repo-review-skill.
> fc6a8c5 docs(root): make the three skills one set — build, audit, survey
> remote: 
> https://github.com/pauljurgens11/shopify/pull/69
> ```

🔧 **Bash**
```
gh pr merge 69 --auto --squash --delete-branch 2>&1|tail -1; sleep 8; gh pr view 69 --json state,statusCheckRollup -q '.state + " | checks: " + ([.statusCheckRollup[]?|.name+"="+(.conclusion//.status//"?")]|join(", "))'
```

> **↳ result**
> ```
> OPEN | checks: pr-checks=, enable=SUCCESS, triage=SUCCESS, rebase=SUCCESS
> ```

### 🤖 Claude

Done. [PR #69](https://github.com/pauljurgens11/shopify/pull/69), auto-merge armed; [#68](https://github.com/pauljurgens11/shopify/pull/68) (the skill itself) is already on `main`.

**All three now split by what you're doing, not by topic** — that was the actual collision. `critical-review` triggered on "review", `repo-review` on "review the repo", and nothing said which won. Each description now leads with the verb and scope in caps, and explicitly hands off to the other two:

- **`resolve-issue`** — build ONE issue → a merged PR
- **`critical-review`** — audit ONE named scope, deep → findings in chat, **never fixes**
- **`repo-review`** — survey the WHOLE build, browser-first → chat + small fixes landed

The read-only/fixes line matters as much as the scope line: it's the tiebreaker when someone says "review workstream D and fix it" (that's `critical-review`, then `resolve-issue`) versus "look at the repo" (`repo-review` does both itself).

**Same shape in all three, so they feel like one tool from the inside:** frontmatter → `# Title` → **The bar:** (one line defining done) → **This skill vs the others:** (routing, with working relative links between the three SKILL.md files) → numbered `## N.` sections → closing `## Checklist`. I verified the structure programmatically and every cross-link resolves.

`critical-review` also picked up the repo's own canon — it now reads SPEC/DECISIONS/PARITY and its "what NOT to report" is tied to §14/§2/§15 rather than generic "the project's stated bar". It arrived from a user-level config where it couldn't assume any of that. I edited another agent's just-merged file to do it; that's noted in the PR body.

[CLAUDE.md:52](CLAUDE.md:52) lists all three with the one-line split, so agents find them at onboarding rather than by accident.

**One thing to clean up yourself:** `~/.claude/skills/critical-review/` still exists with the old generic text. It's now duplicated by the repo copy — the listing in this session showed the stale user-level description, so that's the one currently winning. Since #67 vendored it into the repo, drop the global one:

```bash
rm -rf ~/.claude/skills/critical-review
```

I left it alone because it's outside the repo and would affect your other projects.

### 👤 User

clean it up

### 🤖 Claude

Before deleting, confirming the repo copy fully supersedes it — nothing unique should be lost:

🔧 **Bash**
```
echo "=== files in user-level skill ===" && find ~/.claude/skills/critical-review -type f | sed "s|$HOME|~|" && echo && echo "=== content only in the user-level copy (not in repo copy) ===" && diff <(tr ' ' '\n' < ~/.claude/skills/critical-review/SKILL.md | sort -u) <(tr ' ' '\n' < .claude/skills/critical-review/SKILL.md | sort -u) | grep '^<' | tr -d '\n' | head -c 600; echo; echo "=== paragraph-level: lines present only in user copy ==="; diff ~/.claude/skills/critical-review/SKILL.md .claude/skills/critical-review/SKILL.md | grep '^<' | cut -c1-100
```

> **↳ result**
> ```
> === files in user-level skill ===
> ~/.claude/skills/critical-review/SKILL.md
> 
> === content only in the user-level copy (not in repo copy) ===
> < "find< "review".< (a< PR)< Perform< The< acting< adversarial< asks< audit< audit,< check,< critical",< describe< directly< especially< even< existing< expectations< find< if< independent,< involved< job< new< over"< phrasings< prose/docs< quality< review,< reviewing< say< solid?"< they< thorough,< was< what's< whenever< with",< word< writing< wrong
> === paragraph-level: lines present only in user copy ===
> < description: Run a thorough, adversarial code audit of a scope (a workstream, module, directory, f
> < Perform an independent, adversarial audit of th
> … [truncated, 333 more chars]
> ```

### 🤖 Claude

Only the frontmatter, intro paragraph, and unnumbered headers differ — every substantive section (method, dimensions, what-not-to-report, output format) is preserved verbatim in the repo copy. Single file, no other assets. Removing:

🔧 **Bash**
```
rm -rf ~/.claude/skills/critical-review && echo "removed" && echo "--- ~/.claude/skills now ---" && ls ~/.claude/skills 2>&1 && echo "--- repo skills ---" && ls .claude/skills
```

> **↳ result**
> ```
> removed
> --- ~/.claude/skills now ---
> --- repo skills ---
> critical-review
> repo-review
> resolve-issue
> ```

🔧 **Bash**
```
gh pr view 69 --json state,mergedAt -q '"PR69: "+.state+" "+(.mergedAt//"")'; git fetch -q origin; git log --oneline origin/main -2
```

> **↳ result**
> ```
> PR69: MERGED 2026-08-28T15:14:26Z
> 06663d5 fix(shared): one Search in the storefront header; no discount entry after purchase (#70)
> 333e6ab docs(root): make the three skills one set — build, audit, survey (#69)
> ```

### 🤖 Claude

Cleaned up and everything's landed.

- Deleted `~/.claude/skills/critical-review/` — that dir is now empty, so the repo is the single source for all three skills. It only contained `SKILL.md`, and I diffed it first: the only losses were the old description, the intro paragraph, and unnumbered headers, all of which the repo copy rewrote deliberately.
- [PR #69](https://github.com/pauljurgens11/shopify/pull/69) merged as `333e6ab`, on top of [#68](https://github.com/pauljurgens11/shopify/pull/68).

`main` now carries `.claude/skills/{resolve-issue, critical-review, repo-review}` as one set — build / audit-one-scope / survey-the-whole-build — with matching structure and cross-links, listed in [CLAUDE.md:52](CLAUDE.md:52). Since `.claude/` is committed, every new clone and worktree picks them up, and existing agent branches get them on their next rebase off `main`.
