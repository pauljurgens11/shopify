---
name: repo-review
description: Whole-repo health check of the parallel build — click through the running app, verify what the swarm claims is done, find what is broken between workstreams, fix the small stuff, and report it all in chat. Use when asked "how is it going", "look at the repo", "are the completed issues any good", "what would you improve", or for any review whose scope is the project rather than one module. For a deep audit of ONE workstream, module or PR, use critical-review instead.
---

# Reviewing the whole repo

Ten agents land PRs into `main` all day, each only seeing its own slice. Nobody
looks at the whole thing. That is this skill.

Read [CLAUDE.md](../../../CLAUDE.md), [SPEC.md](../../../SPEC.md),
[docs/issues/INDEX.md](../../../docs/issues/INDEX.md),
[docs/issues/PARITY.md](../../../docs/issues/PARITY.md),
[DECISIONS.md](../../../DECISIONS.md), all of
[docs/AGENT-LOG.md](../../../docs/AGENT-LOG.md), `git log` on main, and open PRs.

**This is a mid-build review, not a launch review.** No readiness scores, no
sign-off. The output is: what's broken, what's drifting apart, what to do next.

**Rank everything by what a person actually sees.** The goal is that someone who
uses Shopify daily opens our admin and can't tell the difference. A clean
abstraction that changes nothing on screen is not a finding.

---

## 1. Open the app before reading any code

The goal is visual. It cannot be judged from a text editor. Read code only after
you have seen the pages — otherwise you start grading intent instead of pixels.

```bash
cp .env.example .env && docker compose up -d && pnpm install && pnpm setup:git && pnpm db:setup
```

Then `preview_start { name: "dev-localhost" }` — **not `dev`**. The in-app browser
only renders `localhost` origins; `lvh.me` loads its HTML and blocks every
subresource, so the admin comes up unstyled and never hydrates (looks broken, is
blocked). First admin compile is ~4 min and the first navigate may 404; reload
once it is warm. If a port won't bind, `pnpm stack status` names the worktree
holding it. Work in your own worktree (`pnpm worktree:env --migrate`) so
`db:reset` doesn't wipe an agent mid-test.

Log in (`owner@demo.dev` / `password123`) and click through everything like a
merchant: home, orders (detail → fulfill → refund), products, collections,
inventory, customers, discounts, analytics, theme builder, settings, apps. Then
the storefront and checkout end to end, and a customer account. Screenshot what's
wrong. Hold each page against PARITY.md and Polaris idiom (§7).

Watch for:

- buttons and nav that go nowhere, or land on an empty shell
- leftover placeholder pages a later issue was supposed to replace
- **pages that disagree with each other** — different table density, tab sets,
  filter placement, empty states, toast wording, where the primary button sits.
  This is the tell that eight people built it, and it is the most common way the
  admin stops reading as Shopify.
- forms that go dirty with no contextual save bar, saves with no toast, missing
  skeletons and empty states
- seed data that reads as fake: lorem, placeholder images, $0.00, flat charts
- console errors, hydration warnings, failed requests — parity defects, not hygiene
- the word "Shopify" or their logo anywhere. Brand string is "Merchant".

## 2. Check the joins between workstreams

This is where the bugs are: each agent tested its own half of every boundary.

- **`packages/contracts`** — types where producer and consumer disagree, fields
  declared and never populated, two workstreams built against two vintages of
  the same shape.
- **Dead seams** — empty function bodies, hardcoded `null`, silent no-ops, a
  "wire this later" nobody came back to. These never throw, so nothing catches
  them. *Real example: order notifications was an empty function, so no webhook
  and no confirmation email ever fired, and every test stayed green.* Assume
  there are more; verify each seam fires end to end against the running stack.
- **Unpaid stubs** — every "stubbed X, moved on" in DECISIONS.md and AGENT-LOG.md:
  paid off, or still load-bearing?
- **The rules nobody owns** (§5, §6, §9): floats in money math anywhere including
  seed and tests; raw prisma in a handler instead of `dbForShop`; nested creates
  missing `shopId`; inventory written directly instead of through the adjustment
  service; wrong error shape; list endpoints with a search box but no `?query=`;
  a PAN reachable by the checkout server or in a log; a decline cascading to the
  next processor.

Run the mandatory suites and paste real output: `pnpm verify`, the tenancy suite,
`packages/pay` tests, discount math, `pnpm e2e`. If e2e can't run, why is itself
a finding.

**Mine the log for leads.** Where an agent wrote a paragraph of prose explaining a
seam, that seam is the most likely thing to be broken now. Where one flagged a
bug for another workstream ("this breaks the demo", "please take this over"),
confirm or kill it with evidence — those hand-offs are routinely dropped.

## 3. Trust nothing that is only written down

`DONE B5 | PR #50` means an agent said so about its own work, at the moment it
stopped, before six other PRs landed on top.

For each issue marked done: open the issue file, read what it was meant to
deliver, check `main` — not the PR description. Verdict per issue: **solid /
only skin deep / broken**. Also report what's unstarted, what claims are stale
(>3h, no PR), and what in-flight work is about to collide.

**Say whether you ran it or just read it.** If most findings are just-read, the
review didn't happen. Go run things.

## 4. Fix what you can

Anything small, visible, and not inside a branch someone is currently working in:
fix it. **Five landed fixes beat a fifty-item list.**

Land it the normal way (§4): branch off fresh `main` as `ws-qa/{slug}`,
conventional commit `fix(ws-qa): …`, `pnpm verify` before every push,
`gh pr create --fill`, `gh pr merge --auto --squash --delete-branch`. Small
coherent PRs, one theme each. Never commit to `main`. Never weaken a test to get
CI green.

Too big, too risky, or someone else's live work: write a new issue file in
`docs/issues/` in the existing format (You own / Depends on / Acceptance / Test
plan), add it to INDEX.md, and append one line per finding to AGENT-LOG.md.
Append only — never edit existing lines.

**Don't:** reopen anything settled in DECISIONS.md; add scope SPEC §2 rules out;
add security past the §15 baseline; write the tests §14 forbids; refactor or
rename for taste; rebuild by hand what Polaris ships.

## 5. Report in chat

No report file. Talk to the user, worst thing first:

1. what breaks if they click around right now
2. where the admin stops looking like Shopify — especially where agents
   contradict each other
3. what's broken between workstreams
4. which "done" issues aren't
5. what you fixed and pushed
6. what you'd do with the next six hours, ranked, honest about what to cut —
   cutting a feature cleanly beats leaving it half-built (§8)

Lead with problems. Skip the summary of what works. Every finding cites
`file:line` or a screenshot. If it's in worse shape than the log makes it sound,
say that plainly — a review that flatters this codebase is worthless.
