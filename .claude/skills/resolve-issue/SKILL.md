---
name: resolve-issue
description: Take one issue from docs/issues/ and land it as a merged PR. Use when picking up backlog work, when asked to "do C3" / "work on the next issue", or when resuming an issue already claimed in AGENT-LOG. Covers claiming, TDD that catches real bugs, verifying against the running stack, and the swarm/environment traps that cost hours. Applies to every workstream — API, admin, storefront, worker, pay, theme, seed.
---

# Resolving an issue

Read [CLAUDE.md](../../../CLAUDE.md), [SPEC.md](../../../SPEC.md) and
[docs/issues/README.md](../../../docs/issues/README.md) first. This is the
operating experience on top of them: the things that are not policy, and that
cost real time when ignored.

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

Available means **every dependency is `DONE` in the log** and no branch or open
PR exists for it. An unfinished claim under ~3h old belongs to someone else.
Then, in one commit:

```bash
git checkout -B ws-{x}/{slug} origin/main
# append to docs/AGENT-LOG.md:  <ISO time> | WS-X | CLAIM {id} … | branch ws-{x}/{slug}
```

Prefer the issue that **unblocks the most others** — read the INDEX dependency
graph, not the ID order.

---

## 2. Read in this order — later sources lose

1. **`packages/contracts/**` — the integration contract beats the issue's prose.**
   Where an issue described a request shape one way and the contract another, the
   contract was right both times: it is what the other seven workstreams code
   against, and "fixing" it to match the prose would have been a breaking change
   for nothing.
2. **Registries and shared config** — `navigation/`, `schema.prisma`,
   `launch.json`, `packages/config/constants.ts`. These are pre-built complete
   and often asserted by a test. When an issue's file paths disagree with the
   registry, the registry wins.
3. **`DECISIONS.md`** — never relitigate a logged decision.
4. **`PARITY.md`** — binding for anything with a screen. Read your page's
   section before writing JSX.
5. The issue's own prose — last, and it is a sketch.

When 1–4 contradict the issue, follow them and **log the divergence in
DECISIONS.md in the same PR**.

---

## 3. Tests that would actually catch something

SPEC §14 lists what not to write. This is the other half. Before writing a test,
answer: **what does it fail on, and would that bug otherwise ship silently?** If
there is no answer, skip it.

Worth testing wherever they appear:

- **Money.** Integer minor units on the wire, strings in inputs, converted once
  at the boundary. `"1.005"` must become `101`, not `100`. This is not one
  workstream's problem: prices, discount math, order totals, refund caps,
  checkout sums and rule conditions all carry it.
- **Rules with a "do not" attached.** The landmines in CLAUDE.md §9 exist because
  the wrong behaviour is plausible — a decline must *not* cascade to the next
  processor, a quantity must *not* move without an adjustment row, a webhook HMAC
  must be over the *raw* body. Each deserves the test that fails when someone
  does the plausible thing.
- **Concurrency, where it is the point.** Anything that increments, allocates a
  sequence, or caps a total. Replacing an atomic write with read-then-write lost
  4 of 8 simultaneous decrements — assert the sum, not one call.
- **Duplicated logic.** Whenever a client previews what the server will do, or a
  seed reproduces what a service does, pin both to the same expectation or they
  drift silently.
- **Anything that writes permanent history** — adjustments, order events,
  payments. An input touched and restored must produce *no* row.
- **The one tenancy hole your own query opens.** General isolation is A2's suite;
  an `OR` clause you added to a list query is yours. A search that reaches a
  neighbouring shop is the unforgivable bug.

### Red first, and for the right reason

Watch the failure before implementing. A new endpoint should fail
`404 Endpoint not found`; a new DTO field, `undefined`. A test that passes on
its first run taught you nothing.

### Mutation-check the load-bearing assertions

Break the implementation deliberately and confirm the *right* test fails —
reverse an ordering, swap an atomic write for read-then-write, swap the scoped
client for the unscoped one, neuter a sanitiser. Restore immediately.

**This proves a test is not vacuous. It does not prove coverage.** A suite of
mine survived every mutation and still missed a bug, because I had only ever
sent the full and empty versions of a payload, never a partial one. Ask
separately: *which shapes of input have I never sent?*

### When a test fails, decide which side is wrong

More than once the test was wrong, not the code. Fix the assertion and say so.
Do not bend an implementation to a mistaken expectation.

---

## 4. Verify by running it

Green tests are not verification. Opening one admin page in a browser found two
bugs in ten minutes that fifteen unit tests had missed. Match the method to the
surface:

| Surface | How |
|---|---|
| API (`apps/api`) | `curl` against a live server; assert the SPEC §5 error shape on the failure paths too |
| Admin (Polaris) | browser — see the recipe below |
| Storefront / checkout (Tailwind) | browser at `{slug}.localhost:3002` |
| Worker / jobs | enqueue a real job, read the log and the DB row it wrote |
| Seed / data | `pnpm db:query` — reconcile what you wrote against what it implies |

### Browser recipe

CLAUDE.md §1 has the canonical version. What it does not say loudly enough:

- Start **`dev-localhost`**, not `dev`. The pane only loads `_next/static/*` for
  the origin of a *registered* preview server, and only the localhost variants
  are registered — browse `http://localhost:3000` (admin) and
  `http://demo.localhost:3002` (storefront). On `*.lvh.me` every asset is
  `ERR_BLOCKED_BY_CLIENT` and you get unstyled HTML with no JS, which looks
  exactly like a broken page rather than a blocked one.
- **Check who owns the port before trusting what you see.** Another worktree's
  server will happily serve you *their* code; a stale placeholder page is the
  tell.
  ```bash
  lsof -a -p "$(lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR==2{print $2}')" -d cwd -Fn
  ```
  If it is not yours, do **not** just kill it — that is someone's running work.
  Start your own pair on free ports and add a temporary url-only entry to
  `.claude/launch.json` (url + no command = attach), then revert it before
  committing.
- A `_merchant_session` cookie minted by another worktree's API fails signature
  checks against yours and is indistinguishable from a broken login. Clear it:
  ```js
  fetch('http://localhost:3001/auth/logout', {method:'POST', credentials:'include',
    headers:{'x-requested-with':'merchant-admin'}})
  ```
- Background dev servers get SIGTERM'd by the task runner; `nohup … & disown`
  survives.
- Drive inputs with `form_input` and a `ref` — coordinate typing often fails to
  reach React state. Coordinates are in the *last screenshot's* frame and go
  stale on every re-render.
- Confirm writes in the database, not just in the UI: `pnpm db:query "select …"`.

### Never fake completeness

If you genuinely cannot verify something, say so plainly and let the user decide.
Do not report "done" for work nobody has looked at.

---

## 5. Scope: finish it, and stop

- **A cut feature's button is not rendered.** No control for a field the contract
  cannot save.
- **A disabled button with no server rule is theatre.** If the UI forbids
  something, the API returns the error too.
- **Gaps you leave are handoffs, not silence.** Accepting-and-ignoring a field is
  fine when another issue owns it — write the note *to that issue* in
  DECISIONS.md and AGENT-LOG, and it will get closed.
- Adding a small endpoint your issue needs is in scope when it is your own
  workstream and the alternative is duplicating server logic elsewhere. Test it
  like any other endpoint.
- Blocked >30 min on something another workstream owns: type it in `contracts`,
  stub it, log it, keep going.

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
from you**: exported function names, endpoint shapes, and the surprises. Address
notes to the specific issue that will consume them.

- A PR with **no checks** is conflicted, not slow — GitHub never built a merge
  commit. Merge `main` and push.
- `DECISIONS.md` / `AGENT-LOG.md` conflict constantly. The union merge driver is
  **local only**; GitHub's merge does not use it.
- Force-push is blocked by a hook. Since PRs squash-merge, a **merge commit never
  reaches main's history** — use one instead of rebasing.

---

## 7. Environment traps, all of which have bitten

| Symptom | Cause |
|---|---|
| `ERR_PNPM_UNSUPPORTED_ENGINE` | wrong `pnpm` on PATH; repo pins a version — `export PATH="/opt/homebrew/bin:$PATH"` |
| `Cannot find module '@merchant/…'` or a third-party package after a merge | stale `node_modules` — `pnpm install` |
| `column … does not exist` in tests or seed | unapplied migration — `pnpm worktree:env --migrate` |
| Prisma init error that reads like a code bug | Docker daemon is down |
| Port won't bind, or you see stale UI | shared 3000–3002; **check cwd before killing anything** |
| git treats a `.ts` as **binary** | a literal control byte from writing files via heredocs — `grep -rlP '[\x00-\x08\x0b\x0c\x0e-\x1f]' src/` |

Other agents run concurrently against a shared Docker stack. Manual test data can
vanish mid-session under someone else's `db:reset` — not your bug, and the reason
every suite creates its own shop.

---

## Checklist

- [ ] Deps `DONE`, nothing in flight, claimed in AGENT-LOG
- [ ] Contracts / registries / DECISIONS / PARITY read; divergences logged
- [ ] Tests written first, seen red for the right reason
- [ ] Load-bearing assertions mutation-checked
- [ ] Asked which input shapes were never tested
- [ ] **Actually ran it** on the right surface; writes confirmed in the DB
- [ ] Cut features not rendered; UI rules enforced server-side too
- [ ] `pnpm verify` green *after* merging main, installing and migrating
- [ ] DECISIONS.md + AGENT-LOG handoffs addressed to named downstream issues
- [ ] Temporary `.env` / `launch.json` edits reverted; test data cleaned up
- [ ] PR title flags `[contracts]` / `[schema]`; auto-merge armed
