---
name: resolve-issue
description: Take one issue from docs/issues/ and land it as a merged PR. Use when picking up backlog work, when asked to "do B4" / "work on the next issue", or when resuming an issue already claimed in AGENT-LOG. Covers claiming, TDD that catches real bugs, verifying UI in a real browser, and the swarm/environment traps that cost hours.
---

# Resolving an issue

Written from issues actually landed in this repo. Every rule below exists because
breaking it cost real time. Read [CLAUDE.md](../../../CLAUDE.md) and
[docs/issues/README.md](../../../docs/issues/README.md) first — this is the
operating experience on top of them, not a replacement.

**The bar:** a merged PR whose behaviour you have *seen work*, not one that
compiles and has green tests.

---

## 1. Pick and claim

```bash
git fetch origin
git show origin/main:docs/AGENT-LOG.md | grep -E "CLAIM|DONE"   # what is taken
git ls-remote --heads origin                                     # what is in flight
gh pr list --state open
```

An issue is available when **every dependency is `DONE` in the log** and no
branch or open PR exists for it. An unfinished claim <3h old belongs to someone
else. Then, in one commit:

```bash
git checkout -B ws-{x}/{slug} origin/main
# append to docs/AGENT-LOG.md:  <ISO time> | WS-X | CLAIM {id} … | branch ws-{x}/{slug}
```

Prefer the issue that **unblocks the most others**. Check the INDEX dependency
graph, not just the ID order.

---

## 2. Read in this order — later sources lose

1. `packages/contracts/**` — **the integration contract wins over issue prose.**
   B2's issue said `mimeType` / 10 MB / no SVG; the contract said `contentType` /
   20 MB / SVG allowed. The contract is what other workstreams code against;
   narrowing it would have been a breaking change for nothing.
2. **Registries and shared config** — `navigation/`, `schema.prisma`,
   `launch.json`. B6's issue put pages under `products/collections`; the nav
   registry (structure fixed, asserted by a test) linked to top-level
   `/collections`. Registry won.
3. `DECISIONS.md` — never relitigate.
4. `PARITY.md` — **binding** for anything with a screen. Read your page's section
   before writing JSX.
5. The issue's own prose — last.

When 1–4 contradict the issue, follow them and **log the divergence in
DECISIONS.md in the same PR**.

---

## 3. Tests that would actually catch something

The repo forbids snapshot tests, per-endpoint CRUD sweeps and mock-heavy glue
tests. What is left is the good stuff. Before writing a test, answer: **what
does this fail on, and would that bug otherwise ship silently?** If there is no
answer, do not write it.

Worth testing, every time:

- **Money.** Strings in inputs, integer minor units on the wire, converted once
  at the boundary. `"1.005"` must become `101`, not `100`. A price *condition* is
  minor units too — get it backwards and you build a collection for products
  under $0.20 instead of $20.
- **Concurrency, where it is the point.** Swapping the atomic increment for
  read-then-write lost **4 of 8** simultaneous decrements. Assert the sum.
- **Duplicated rules.** When the client previews what the server will do
  (variant matrix, collection rules), pin both to the same expectation or they
  drift silently.
- **Anything that writes permanent history.** A cell typed into and restored must
  produce *no* adjustment row.
- **The one tenancy hole your own query opens.** A `?query=` OR-clause is where a
  shop filter escapes. General isolation is A2's suite; the OR case is yours.

### Red first, and for the right reason

Watch the failure before implementing. A new endpoint's tests should fail with
`404 Endpoint not found`, a new DTO field with `undefined`. If a test passes on
the first run, you learned nothing about it.

### Mutation-check the load-bearing assertions

Break the implementation on purpose and confirm the *right* test fails:

| Mutation | Expected failure |
|---|---|
| reverse the cartesian order | matrix ordering test |
| `increment` → read-then-write | concurrency sum test |
| `dbForShop` → `dbAdmin` | cross-tenant search test |
| `safeFilename` → identity | path-traversal test |

Restore immediately. **This proves a test is not vacuous. It does not prove
coverage** — my B1 tests survived every mutation and still missed a partial-
payload bug another agent found later, because I only ever tested the full and
empty cases. Ask separately: *which shapes of input have I never sent?*

### When a test fails, decide which side is wrong

Twice here the test was wrong, not the code — `fromDecimal` legitimately accepts
`"20."`. Fix the assertion and say so. Do not bend the implementation to a
mistaken expectation.

---

## 4. Verify by running it

Green tests are not verification. For an API, drive it with `curl` against a
live server; for UI, **open it in a browser**. On B5 that found two bugs in ten
minutes that 15 unit tests had missed — one of which silently dropped every
pasted option value but the last.

### Browser recipe (this cost an hour to work out)

- The pane only loads `_next/static/*` for the origin of a **registered preview
  server**. `preview_start {name:'dev'}` registers `localhost:3000`, so browse
  **`http://localhost:3000`, never `http://admin.lvh.me:3000`** — otherwise
  every asset is `ERR_BLOCKED_BY_CLIENT` and you get unstyled HTML with no JS,
  which looks exactly like a broken page.
- The API must allow that origin: set `ADMIN_URL` / `API_URL` to the localhost
  pair in the (gitignored) `.env` **before** starting, or `/auth/me` fails CORS.
- **Check who owns the port before trusting what you see:**
  `lsof -a -p $(lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR==2{print $2}') -d cwd -Fn`
  Another worktree's server will happily serve you *their* code — a stale
  placeholder page is the tell.
- If the ports are taken, run your own pair on free ports and add a temporary
  **url-only entry** to `.claude/launch.json` (url + no command = attach), then
  revert it before committing.
- Background dev servers get SIGTERM'd by the task runner. `nohup … & disown`
  survives.
- A `_merchant_session` cookie minted by another worktree's API fails signature
  checks against yours and looks identical to a broken login. Clear it:
  `fetch('…/auth/logout', {method:'POST', credentials:'include', headers:{'x-requested-with':'merchant-admin'}})`
- `form_input` with a `ref` sets React state reliably; coordinate typing often
  does not. Coordinates are in the **last screenshot's** frame and go stale on
  every re-render.
- Confirm writes in the database, not just in the UI —
  `pnpm db:query "select …"`.

### Never fake completeness

If you genuinely cannot verify something, say so plainly and let the user
decide. Do not report "done" for work nobody has looked at.

---

## 5. Scope: finish it, and stop

- **A cut feature's button is not rendered.** No collections picker on the
  product form when the contract cannot save collection ids.
- **A disabled button with no server rule is theatre.** If the UI greys out
  "delete a location holding stock", the API returns 409 too.
- **Gaps you leave are handoffs, not silence.** B1 accepted-and-ignored
  `inventoryQuantity`; that went in DECISIONS.md addressed to B4, and B4 closed
  it. Write the note *to the issue that will fix it*.
- Adding a small endpoint your issue needs is in scope when it is your
  workstream and the alternative is duplicating server logic in the browser.
  Test it like any other endpoint.

---

## 6. Land it

```bash
pnpm verify                      # lint + typecheck + unit — before every push
git fetch origin && git merge origin/main
pnpm install                     # ALWAYS after merging — stale node_modules
pnpm worktree:env --migrate      # ALWAYS after merging — new migrations
pnpm verify                      # again, on the merged tree
git push -u origin ws-{x}/{slug}
gh pr create --title "feat(ws-{x}): …"   # add [contracts] / [schema] if touched
gh pr merge <n> --auto --squash --delete-branch
```

Then append `DONE {id} | PR #n` to AGENT-LOG with **what downstream issues need
from you** — the exported function names, the endpoint shapes, the surprises.

- A PR with **no checks** is conflicted, not slow. Rebase or merge `main`.
- `DECISIONS.md` / `AGENT-LOG.md` conflict constantly: the union merge driver is
  **local only**, GitHub's merge does not use it.
- Force-push is blocked by a hook. Since PRs squash-merge, a **merge commit
  never reaches main's history** — use one instead of rebasing.

---

## 7. Environment traps, all of which have bitten

| Symptom | Cause |
|---|---|
| `ERR_PNPM_UNSUPPORTED_ENGINE` | wrong `pnpm` on PATH; repo pins 9.15.4 — `export PATH="/opt/homebrew/bin:$PATH"` |
| `Cannot find module '@merchant/…'` after a merge | stale `node_modules` — `pnpm install` |
| `column … does not exist` in seed tests | unapplied migration — `pnpm worktree:env --migrate` |
| Prisma init error that reads like a code bug | Docker daemon is down |
| Port won't bind / you see someone else's page | shared 3000–3002; **check cwd before killing anything** |
| git treats your `.ts` as **binary** | a literal control byte from writing files via heredocs — `grep -rlP '[\x00-\x08\x0b\x0c\x0e-\x1f]' src/` |

Other agents run concurrently against a shared Docker stack. Your manual test
data can vanish mid-session under someone's `db:reset` — that is not your bug,
and it is why suites create their own shop.

---

## Checklist

- [ ] Deps `DONE`, nothing in flight, claimed in AGENT-LOG
- [ ] Contracts / registry / DECISIONS / PARITY read; divergences logged
- [ ] Tests written first, seen red for the right reason
- [ ] Load-bearing assertions mutation-checked
- [ ] Asked which input shapes were never tested
- [ ] **Actually ran it** — browser for UI, curl for API, DB for writes
- [ ] Cut features not rendered; UI rules enforced server-side too
- [ ] `pnpm verify` green after merging main
- [ ] DECISIONS.md + AGENT-LOG handoffs written to named downstream issues
- [ ] Temporary `.env` / `launch.json` edits reverted; test data cleaned
- [ ] PR title flags `[contracts]` / `[schema]`; auto-merge armed
