# Running 20 agents on this repo

Two independent problems. Solve both or neither works.

1. **Merge mechanics** — 20 branches must land on `main` without a human
   babysitting each one. That is automerge + branch rules + CI shape (§1–§4).
2. **Merge *content*** — two agents must rarely want the same lines. That is the
   repo layout: file-per-unit and pre-built registries (§5, and CLAUDE.md §3).

Automerge without the second is just a faster way to produce conflicts.

---

## 1. Repo settings (once, by a repo admin)

```bash
gh repo edit pauljurgens11/shopify \
  --enable-auto-merge \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge
```

- **Auto-merge on** is the switch that makes `gh pr merge --auto` legal at all.
- **Squash only.** One commit per PR keeps `main` linear and makes a bad merge a
  single `git revert`. With 20 agents you *will* revert something.
- **Delete branch on merge** — otherwise you accumulate hundreds of stale refs
  and `git fetch` slows to a crawl.

UI equivalent: *Settings → General → Pull Requests* — tick "Allow squash
merging", "Allow auto-merge", "Automatically delete head branches"; untick
"Allow merge commits" and "Allow rebase merging".

---

## 2. Branch ruleset for `main`

The ruleset is committed at [`.github/rulesets/main.json`](../.github/rulesets/main.json). Apply it:

```bash
gh api -X POST /repos/pauljurgens11/shopify/rulesets --input .github/rulesets/main.json
```

To update it later, list rulesets (`gh api /repos/{owner}/{repo}/rulesets`), then
`PUT` to `/rulesets/{id}` with the same file.

What it enforces, and why each line matters for 20 agents:

| Rule | Setting | Why |
|---|---|---|
| `pull_request` | **0 required approvals** | There is no human to approve 20 PRs an hour. The gate is CI, not review. Raise this only if a human is genuinely in the loop. |
| `required_status_checks` | `pr-checks` only | One required check, the fast one. See §3. |
| **strict / "up to date before merging"** | **OFF** | The single most important setting here. With it on, every merge to `main` invalidates all 19 other PRs and they serialize into a rebase storm. Off means PRs merge in parallel; the cost is that a *semantic* conflict (both sides valid, combination broken) can reach `main`. §4 is how you buy that back. |
| `required_linear_history` | on | Squash + rebase only; keeps `git bisect` and revert usable. |
| `deletion`, `non_fast_forward` | on | Nobody force-pushes or deletes `main`. |

Note there is no `require_code_owner_review`. `CODEOWNERS` in this repo is a
routing/notification hint, not a gate — a required code-owner review with agent
authors would deadlock immediately.

---

## 3. CI shape is a throughput decision

Required checks are a shared resource. Twenty agents × a 10-minute required
check = a queue nobody clears.

| Workflow | Trigger | Required? | Budget |
|---|---|---|---|
| `pr-checks` | every PR | **yes** | < 4 min: biome, tsc, unit tests, tenancy suite against a service-container Postgres |
| `main-checks` | push to `main` | no (post-merge) | Playwright smoke + docker build. Breakage pages the owning workstream; it does not block 19 other PRs. |

Keep `pr-checks` as one job with one name. The required-check context is matched
by **job name**, so renaming the job silently disables the gate — if you rename
it, update `.github/rulesets/main.json` in the same PR.

---

## 4. Merge queue — turn it on when contention shows up

Skip it on day 1. Turn it on the moment you see a semantic break on `main` more
than once (the cost of §2's "strict off").

A merge queue takes each approved PR, speculatively rebases it onto `main` *plus
the PRs ahead of it in the queue*, runs CI on that combination, and merges only
if green. You get up-to-date-branch guarantees without the rebase storm, because
GitHub does the batching rather than 20 agents each rebasing 19 times.

Apply [`.github/rulesets/main-with-merge-queue.json`](../.github/rulesets/main-with-merge-queue.json) over the existing ruleset (`PUT`, see that directory's README).
Then add the queue trigger to `pr-checks`:

```yaml
on:
  pull_request:
  merge_group:   # ← required, or queued PRs hang forever waiting for a check that never runs
```

Parameters baked into that file:
`merge_method: SQUASH`, `max_entries_to_build: 5`, `min_entries_to_merge: 1`,
`min_entries_to_merge_wait_minutes: 2`, `grouping_strategy: ALLGREEN`.

---

## 5. What actually prevents conflicts

Automerge only helps with PRs that *can* merge. Everything below is about making
that the normal case. Details in [CLAUDE.md §3](../CLAUDE.md); the mechanics:

**Layout.** One file per route / nav item / theme section / worker job / Prisma
domain, and every registry pre-built complete from SPEC. Agents create and fill
leaf files; they don't edit shared arrays.

**`.gitattributes` merge drivers.** Committed at the repo root:
- `DECISIONS.md`, `docs/AGENT-LOG.md` → `merge=union`. Concurrent appends both
  survive, automatically. Requires that agents only ever append at the bottom.
  **This works locally and not on GitHub** — see the box below.
- `pnpm-lock.yaml` → custom `merge=pnpm-lock` driver
  ([`scripts/git/merge-lockfile.sh`](../scripts/git/merge-lockfile.sh)): takes
  our side and regenerates from the merged `package.json` files. Textual merges of
  lockfiles produce files that parse and are wrong.
- `packages/db/prisma/migrations/**` → `-merge`. A conflict there means two agents
  took the same migration number; the fix is renaming, never merging SQL.

**Local git config** (`pnpm setup:git`, required for every agent):
`rerere` on — the same conflict gets solved once and replayed forever;
`pull.rebase` + `rebase.autoStash` + `rebase.updateRefs`;
`merge.conflictStyle=zdiff3` — shows the merge base, which makes agent-driven
resolution dramatically more reliable than the default two-way markers.
The merge drivers above only exist after this runs — `.gitattributes` names a
driver, git config defines it.

**PR size.** A ~400-line, one-hour PR rebases cleanly. A two-day branch does not.
This is the highest-leverage rule on the list and the easiest to let slip.

> ### GitHub ignores merge drivers, and the failure is silent
>
> `merge=union` is applied by *your* git, not by GitHub's. When GitHub computes
> whether a PR is mergeable it does a plain three-way merge, so two agents
> appending to `DECISIONS.md` make each other's PRs **CONFLICTING** even though
> both rebase cleanly on a laptop.
>
> That would be a minor annoyance if it were visible. It is not: GitHub cannot
> build a merge commit for a conflicting PR, and `pull_request` workflows run
> against that merge commit — so **`pr-checks` never starts**. The PR does not go
> red. It sits with auto-merge armed and zero checks, indefinitely. Three PRs
> were stuck this way, including the admin shell, before anyone noticed.
>
> Mitigations, in the order they fire:
> 1. [`pr-health.yml`](../.github/workflows/pr-health.yml) runs on every push to
>    `main` and labels each unmergeable PR `needs-rebase` with a comment saying
>    what to do. It uses `pull_request_target`, which — unlike `pull_request` —
>    still fires for a conflicting PR.
> 2. `pnpm sync` rebases your branch and pushes it. That is the whole fix.
> 3. Optionally, the `rebase` job in the same workflow does step 2 for you, for
>    any PR that already has auto-merge enabled. It needs a PAT
>    (`gh secret set AGENT_PAT`) because a push made with the built-in
>    `GITHUB_TOKEN` does not trigger workflows — the branch would become
>    mergeable and then wait forever for a check that can never start.
>
> The durable fix is the one in CLAUDE.md §3: keep shared files out of the hot
> path. Every file two agents append to on the same day will do this.

---

## 6. The agent's loop

```bash
git fetch origin && git rebase origin/main
git switch -c ws-b/product-variant-editor
# ...work...
pnpm verify
git push -u origin ws-b/product-variant-editor
gh pr create --fill --label ws-b
gh pr merge --auto --squash --delete-branch
```

Then **start the next slice immediately**. Do not poll the PR. If checks fail,
GitHub leaves it open and the agent picks it up on its next sweep:

```bash
gh pr list --author @me --state open --json number,title,mergeable,labels
gh pr checks <n>                       # why it's red
pnpm sync                              # `needs-rebase`, or no checks at all
```

Read `mergeable` on that sweep, not just the check status. `CONFLICTING`, or a
PR with **no checks at all**, both mean the same thing and have the same fix:
`pnpm sync` from that branch's worktree.

Belt-and-braces: [`.github/workflows/auto-merge.yml`](../.github/workflows/auto-merge.yml)
enables auto-merge on any PR labelled `automerge`, for agents that forget the flag.

---

## 7. Failure modes, and what to do

| Symptom | Cause | Fix |
|---|---|---|
| PRs pile up, all "waiting for status" | required check name ≠ job name | Align `.github/rulesets/main.json` with the job name in `pr-checks.yml` |
| Every PR conflicts on `pnpm-lock.yaml` | agent skipped `pnpm setup:git` | Run it; `.gitattributes` alone doesn't install the driver |
| `main` typechecks locally, breaks in CI | semantic conflict from strict-off | Turn on the merge queue (§4) |
| Two migrations with the same number | agent didn't pull before generating | Rename yours; migrations are `-merge` on purpose |
| Constant conflicts in one file | that file is a shared registry | Split it file-per-unit; see the table in CLAUDE.md §3 |
| Auto-merge silently not enabled | repo setting off, or PR is a draft | `gh repo edit --enable-auto-merge`; `gh pr ready <n>` |
| **PR has no checks at all** — not red, not pending, nothing | PR is `CONFLICTING`, so GitHub never built the merge commit `pull_request` workflows run against | `pnpm sync`. This is the §5 box; it is the most expensive failure here because it looks like CI being slow |
| PR conflicts only in `DECISIONS.md` / `docs/AGENT-LOG.md` | GitHub does not apply the `merge=union` driver your machine does | `pnpm sync` — the rebase resolves them locally. Do not hand-edit the log files |
