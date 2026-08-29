# Dev Claude markdown spec

| | |
|---|---|
| **Session** | `a500dd6f-95bd-40ec-960f-9430ea2fe687` |
| **Started** | 2026-08-28T07:13:06.238Z |
| **Ended** | 2026-08-28T07:20:22.357Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | yes |

---

### 👤 User

create ultra good dev claude md based on spec

### 🤖 Claude

I'll read the spec first.

🔧 **Bash**
```
wc -l SPEC.md && ls -la
```

> **↳ result**
> ```
> 344 SPEC.md
> total 72
> drwxr-xr-x@  5 pauljurgens  staff    160 Aug 28 10:10 .
> drwxr-xr-x@ 20 pauljurgens  staff    640 Aug 28 09:58 ..
> drwxr-xr-x@  3 pauljurgens  staff     96 Aug 28 10:05 .claude
> drwxr-xr-x  10 pauljurgens  staff    320 Aug 28 10:11 .git
> -rw-r--r--@  1 pauljurgens  staff  34418 Aug 28 10:10 SPEC.md
> ```

🔧 **Bash**
```
cat SPEC.md
```

> **↳ result**
> ```
> <persisted-output>
> Output too large (33.6KB). Full output saved to: /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/a500dd6f-95bd-40ec-960f-9430ea2fe687/tool-results/b63526wi9.txt
> 
> Preview (first 2KB):
> # PROJECT NORTHSTAR — Multi-Tenant Shopify Clone
> 
> **This document is the single source of truth.** Every agent reads this before writing code. If code and this document disagree, this document wins. If this document is ambiguous, the agent picks the option that maximizes the KPI and records the decision in `DECISIONS.md` (append-only, one line per decision).
> 
> ---
> 
> ## 1. Mission & KPI
> 
> Build a multi-tenant e-commerce platform that is visually and functionally i
> … [truncated, 1,531 more chars]
> ```

🔧 **Bash**
```
sed -n '1,180p' SPEC.md
```

> **↳ result**
> ```
> # PROJECT NORTHSTAR — Multi-Tenant Shopify Clone
> 
> **This document is the single source of truth.** Every agent reads this before writing code. If code and this document disagree, this document wins. If this document is ambiguous, the agent picks the option that maximizes the KPI and records the decision in `DECISIONS.md` (append-only, one line per decision).
> 
> ---
> 
> ## 1. Mission & KPI
> 
> Build a multi-tenant e-commerce platform that is visually and functionally indistinguishable from Shopify for common e-commerce use.
> 
> **Priority order (resolve every trade-off with this):** 1. appearance parity, 2. functionality, 3. performance, 4. everything else (incl. security beyond the §15 baseline).
> 
> **KP
> … [truncated, 16,765 more chars]
> ```

🔧 **Bash**
```
sed -n '180,344p' SPEC.md
```

> **↳ result**
> ```
> - **Rate limiting**: Fastify rate-limit — login: 10/min/IP; Admin API: 40 req/s burst 80 per token (mirrors Shopify's leaky bucket vibe); checkout payment attempts: 5/min/session.
> 
> ---
> 
> ## 9. Admin App — Pixel-Parity Requirements
> 
> **The single most important workstream for the KPI.** Rules:
> 
> - **Polaris ^13 components only.** No custom CSS beyond what Polaris tokens allow. If Polaris has a pattern for it, use exactly that pattern. `AppProvider` with default theme. Frame + TopBar + Navigation exactly as Shopify: dark top bar with global search (Cmd+K modal), notifications bell, shop avatar menu; left nav with exact Shopify structure and icons:
>   - Home, Orders (badge count), Products (subitem
> … [truncated, 16,097 more chars]
> ```

🔧 **Bash**
```
find .claude -type f | head -50; echo ---; ls ~/.claude/CLAUDE.md 2>/dev/null && echo "global exists"
```

> **↳ result**
> ```
> Exit code 1
> ---
> ```

🔧 **Bash**
```
ls -laR .claude
```

> **↳ result**
> ```
> total 0
> drwxr-xr-x@ 3 pauljurgens  staff   96 Aug 28 10:05 .
> drwxr-xr-x@ 5 pauljurgens  staff  160 Aug 28 10:10 ..
> drwxr-xr-x@ 2 pauljurgens  staff   64 Aug 28 10:05 worktrees
> 
> .claude/worktrees:
> total 0
> drwxr-xr-x@ 2 pauljurgens  staff  64 Aug 28 10:05 .
> drwxr-xr-x@ 3 pauljurgens  staff  96 Aug 28 10:05 ..
> ```

### 🤖 Claude

Spec read. Writing the agent operating manual now.

🔧 **Bash**
```
cat > /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md <<'CLAUDE_MD_EOF'
# CLAUDE.md — Project Northstar operating manual

Multi-tenant Shopify clone ("**Merchant**"). Greenfield monorepo, 2-day build, many agents in parallel.

**[SPEC.md](SPEC.md) is the single source of truth.** This file is *how to work*; SPEC.md is *what to build*. If they conflict, SPEC.md wins on product decisions, this file wins on process. Read SPEC.md §-by-§ for your workstream before writing code — do not build from this summary alone.

---

## 0. The one thing to remember

**KPI: a Shopify user opens our admi
… [truncated, 10,010 more chars]
```

> **↳ result**
> ```
> written
>      169 /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
> ```

🔧 **Bash**
```
cat > DECISIONS.md <<'EOF'
# DECISIONS

Append-only. One line per decision. Never edit or delete an existing line.

Format: `YYYY-MM-DD | WS{X} | decision — rationale`

Log here when you: resolve a SPEC.md ambiguity, use the Polaris 20-minute escape hatch, make a breaking `packages/contracts` change (log BEFORE the change), stub against another workstream after being blocked >30 min, or build a minimal version of something SPEC.md §2 lists as out of scope.

---

EOF
echo done; ls
```

> **↳ result**
> ```
> done
> CLAUDE.md
> DECISIONS.md
> SPEC.md
> ```

### 🤖 Claude

Wrote [CLAUDE.md](CLAUDE.md) (169 lines) and seeded [DECISIONS.md](DECISIONS.md), which the spec mandates and CLAUDE.md leans on.

The design principle: CLAUDE.md is *how to work*, SPEC.md stays *what to build*. It doesn't restate the spec — it points into it and front-loads only what agents get wrong when they skim. Sections:

- **The one thing** — the KPI and the trade-off priority order, so ambiguity resolves without stalling.
- **Commands** — quickstart, per-task table, `pnpm`-only warning, local URLs, demo creds.
- **Before you touch a file / Ownership** — the parallel-agent rules: read your §16 row, pull before migrating, additive-vs-breaking contract changes, the "stub against contracts and keep going" rule, nav registry ownership.
- **Non-negotiable conventions** — money as integer minor units, ULID prefixes, the exact error envelope, cursor pagination. The cross-workstream breakage surface.
- **Multi-tenancy** — `dbForShop` with the "if you're hand-writing `shopId` in a `where`, you're using the wrong client" tell, plus the three legal `dbAdmin` sites.
- **Pixel parity** — Polaris v13 only, admin-only, the 20-minute escape hatch, Tailwind everywhere else.
- **Working style** — ship-the-KPI, no throwing stubs, the forbidden-tests list, security capped at the §15 baseline, out-of-scope as a hard stop.
- **Landmines** — the failure modes with teeth: floats for money, raw Prisma in handlers, raw inventory updates bypassing adjustment history, cascading a *decline* to the next processor, PAN reaching the checkout server, missing `ANTHROPIC_API_KEY` breaking the demo.
- **Layout** — directory map with one-line purposes.

Two things worth your call: I did not add a `## Style` section on comments/naming, since there's no code yet to match — worth adding once workstream A lands. And the command table assumes conventional script names (`pnpm typecheck`, `db:setup`, `e2e`); if A names them differently, that table needs a pass.

### 👤 User

push to git

🔧 **Bash**
```
git log --oneline -5 2>&1 | head; echo "--- remotes:"; git remote -v; echo "--- status:"; git status --short
```

> **↳ result**
> ```
> f5384ba Add destination spec for multi-tenant Shopify clone
> --- remotes:
> origin	git@github.com:pauljurgens11/shopify.git (fetch)
> origin	git@github.com:pauljurgens11/shopify.git (push)
> --- status:
> ?? CLAUDE.md
> ?? DECISIONS.md
> ```

🔧 **Bash**
```
git add CLAUDE.md DECISIONS.md && git commit -q -F - <<'EOF'
Add agent operating manual and decision log

CLAUDE.md covers how agents work this repo: commands, workstream
ownership and conflict rules, the conventions that break other
workstreams when violated (money as integer minor units, ULID
prefixes, error envelope, cursor pagination), dbForShop tenancy,
Polaris pixel-parity rules, and the landmine list. SPEC.md remains
the source of truth for what to build.

DECISIONS.md is the append-only log SPEC.md mandates.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
git log --oneline -
… [truncated, 1 more chars]
```

> **↳ result**
> ```
> ac1994b Add agent operating manual and decision log
> f5384ba Add destination spec for multi-tenant Shopify clone
> ```

🔧 **Bash**
```
git push -u origin main 2>&1 | tail -5
```

> **↳ result**
> ```
> To github.com:pauljurgens11/shopify.git
>    f5384ba..ac1994b  main -> main
> branch 'main' set up to track 'origin/main'.
> ```

### 🤖 Claude

Pushed to `origin/main` as `ac1994b` — CLAUDE.md and DECISIONS.md, on top of the existing SPEC.md commit.

I committed straight to main rather than opening a branch/PR: the repo is solo, main already holds the spec commit, and there's no CI or review flow to run this through. Say the word if you'd rather these land via PRs going forward.

### 👤 User

make sure agents know to develop in branches and that auto merge is enabled.

🔧 **Bash**
```
gh auth status 2>&1 | head -5; echo "--- repo settings:"; gh api repos/pauljurgens11/shopify --jq '{allow_auto_merge, delete_branch_on_merge, allow_squash_merge, allow_merge_commit, allow_rebase_merge, default_branch, private}' 2>&1
```

> **↳ result**
> ```
> Exit code 127
> (eval):1: command not found: gh
> --- repo settings:
> (eval):1: command not found: gh
> ```

🔧 **Bash**
```
ls /opt/homebrew/bin/gh /usr/local/bin/gh 2>/dev/null; echo "---"; which git; echo "--- token?"; env | grep -i -E 'GH_TOKEN|GITHUB_TOKEN' | sed 's/=.*/=<set>/'
```

> **↳ result**
> ```
> ---
> /opt/homebrew/bin/git
> --- token?
> ```

🔧 **Bash**
```
grep -n '§' CLAUDE.md | grep -v 'SPEC.md §'
```

> **↳ result**
> ```
> 13:Resolve *every* trade-off in this order: **1. appearance parity → 2. functionality → 3. performance → 4. everything else (incl. security beyond the §15 baseline).**
> 109:The tenancy test suite (§14.1) is mandatory and blocking. Do not merge past a red tenancy test.
> ```

🔧 **Bash**
```
python3 - <<'PY'
import re
p='CLAUDE.md'
s=open(p).read()

# renumber sections 9..4 -> 10..5 (descending to avoid collisions)
for n in range(9,3,-1):
    s=s.replace(f'\n## {n}. ', f'\n## {n+1}. ')

new_section = """
## 4. Git workflow

**Never commit to `main`.** Every agent works on its own branch and lands through a pull request with auto-merge armed.

```bash
git checkout main && git pull                 # always start from fresh main
git checkout -b ws{X}/short-description       # e.g. wsD/vault-tokenize
# ... work, commit in logical chunks ...
git push -u origin ws{X}/short-description
g
… [truncated, 1,168 more chars]
```

> **↳ result**
> ```
> 9:## 0. The one thing to remember
> 19:## 1. Commands
> 47:## 2. Before you touch a file
> 54:## 3. Ownership & conflict rules
> 65:## 4. Git workflow
> 88:## 5. Non-negotiable conventions
> 115:## 6. Multi-tenancy — the load-bearing wall
> 136:## 7. Admin app — pixel parity (the KPI workstream)
> 150:## 8. Working style for this project
> 162:## 9. Landmines
> 177:## 10. Layout
> ```

🔧 **Bash**
```
sed -n '47,64p' CLAUDE.md; echo "=== landmines ==="; sed -n '162,176p' CLAUDE.md
```

> **↳ result**
> ```
> ## 2. Before you touch a file
> 
> 1. **Read your workstream row in SPEC.md §16** — it defines the directories you own.
> 2. **Read `DECISIONS.md`** — it records what other agents already settled. Never relitigate a logged decision.
> 3. **`git pull`** before creating a Prisma migration.
> 4. **Types before code**: whatever crosses a package or service boundary is defined in `packages/contracts` first.
> 
> ## 3. Ownership & conflict rules
> 
> - You may freely edit **inside your workstream's directories**. Never edit another workstream's app code.
> - **Need something another workstream owns?** Define the type in `packages/contracts`, stub against it, and keep going. Blocked >30 min → stub + one line in `DECIS
> … [truncated, 1,677 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
p='CLAUDE.md'
s=open(p).read()

s=s.replace(
"""3. **`git pull`** before creating a Prisma migration.
4. **Types before code**""",
"""3. **Cut a branch off fresh `main`** (§4) — never work on `main` itself.
4. **`git pull`** before creating a Prisma migration.
5. **Types before code**""")

s=s.replace(
"- Floats for money — anywhere, including tests and seed data.",
"- Committing to `main`, or merging your own PR past a red check.\n- Floats for money — anywhere, including tests and seed data.")

open(p,'w').write(s)
PY
sed -n '47,55p' CLAUDE.md
```

> **↳ result**
> ```
> ## 2. Before you touch a file
> 
> 1. **Read your workstream row in SPEC.md §16** — it defines the directories you own.
> 2. **Read `DECISIONS.md`** — it records what other agents already settled. Never relitigate a logged decision.
> 3. **Cut a branch off fresh `main`** (§4) — never work on `main` itself.
> 4. **`git pull`** before creating a Prisma migration.
> 5. **Types before code**: whatever crosses a package or service boundary is defined in `packages/contracts` first.
> 
> ## 3. Ownership & conflict rules
> ```

### 🤖 Claude

Now the repo setting itself — auto-merge has to be enabled on GitHub, and `gh` isn't installed here:

🔧 **Bash**
```
git add CLAUDE.md && git commit -q -F - <<'EOF'
Require branch-based development with auto-merge

Agents must never commit to main: branch as ws{X}/description, open a
PR, and arm auto-merge so it lands when CI goes green. Adds the
workflow section, the branch step to the pre-work checklist, and a
landmine for committing to main or merging past a red check.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
git push -q origin main && git log --oneline -1
```

> **↳ result**
> ```
> c5f2044 Require branch-based development with auto-merge
> ```

### 🤖 Claude

CLAUDE.md updated and pushed (`c5f2044`). Agents now get, in three places:

- **§4 Git workflow** (new) — branch off fresh `main` as `ws{X}/short-description`, push, `gh pr create --fill`, then `gh pr merge --auto --squash --delete-branch`. Plus: don't watch the queue, don't merge past a red check, don't disable a test to get one green, rebase rather than merge-back, never force-push a shared branch, and tag PRs touching `packages/contracts` / `schema.prisma` in the title so others know to pull before migrating.
- **§2 pre-work checklist** — "cut a branch off fresh `main`" is now step 3.
- **§9 Landmines** — "Committing to `main`, or merging your own PR past a red check."

**The repo setting is not enabled yet, and I can't do it from here** — `gh` isn't installed and there's no `GITHUB_TOKEN` in the environment, so I have no authenticated path to the GitHub API. CLAUDE.md currently asserts auto-merge *is* enabled; that becomes true once you flip it. Two options:

Settings → General → Pull Requests → check **Allow auto-merge** at https://github.com/pauljurgens11/shopify/settings

Or install `gh` and run:

```bash
brew install gh && gh auth login && gh api -X PATCH repos/pauljurgens11/shopify -f allow_auto_merge=true -f delete_branch_on_merge=true
```

One caveat worth knowing: auto-merge only actually queues a PR when the repo has a required status check or a required review on `main` — with no branch protection, GitHub lets the PR merge immediately and `--auto` has nothing to wait for. If you want the "lands when CI is green" behavior the doc describes, add a branch protection rule on `main` requiring the CI workflow once SPEC.md §14's GitHub Actions pipeline exists. Want me to write that workflow file now so there's a check to require?

### 👤 User

i allowed auto merge. if you made any local changes, push them with the new flow

🔧 **Bash**
```
git status --short; echo "--- sync:"; git fetch -q origin && git log --oneline origin/main -1 && git status -sb | head -1
```

> **↳ result**
> ```
> --- sync:
> c5f2044 Require branch-based development with auto-merge
> ## main...origin/main
> ```

### 🤖 Claude

Nothing to push — the working tree is clean and `main` is level with `origin/main` at `c5f2044`. Both changes from this session (CLAUDE.md + DECISIONS.md, then the git-workflow section) went up before you enabled auto-merge, so there's no leftover local work to route through the new flow.

The doc's claim that auto-merge is enabled is now accurate. From here on I'll branch as `ws{X}/…` and land via PR rather than pushing to `main`.

Still worth flagging from last turn: with no branch protection on `main`, `gh pr merge --auto` has no required check to wait for and GitHub will just merge the PR on the spot. The flow works, but "lands when CI is green" won't literally be true until there's a required status check. That needs SPEC.md §14's GitHub Actions workflow (typecheck → biome → unit → e2e → docker build) to exist first — I can write it whenever you want, though it'll have nothing to run against until workstream A lands the packages.
