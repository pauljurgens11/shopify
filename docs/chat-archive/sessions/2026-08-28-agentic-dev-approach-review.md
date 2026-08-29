# Agentic dev approach review

| | |
|---|---|
| **Session** | `a7beb6b8-af6a-458a-be56-44f242bb880c` |
| **Started** | 2026-08-28T07:05:05.536Z |
| **Ended** | 2026-08-28T07:06:04.269Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | yes |

---

### 👤 User

i am approaching agentic dev with this logic. do you see any problems. i have to create a huge project very fast.

1. Document destination scalable secure best peactices, think through the deploy flow, tests that help you develop. Locally runnable.
2. Document journey/Plan
3. Review plan
4. Break down plan into unique separate steps (issues, local files, independently grabbable, doable in parallel if possible, test driven development, feedback based) name dependencies (issues that need to be done before the next)
   1. Sidebar with all tabs
   2. Tabs can be done in parallel
5. Set up claude md and skills. Minimal but good. Mb skip skills. You need context of successful runs before crwating skills. “Review what you did and create the skill”
6. Init project. Set up infra with best practices for development. Maybe deployment
7. Set up workflow. How parallel agents operate
8. Start dev
9. QA engineers. If you see any problems, create new issues.
10. End to end tests

### 🤖 Claude

The logic is broadly right, but there are five problems that will actually bite you — one of them is fatal at scale.

## The big one: you decompose before the code exists

Step 4 (break into parallel issues) happens before step 6 (init project). So your issue boundaries are fiction — invented file layouts, guessed seams. Real parallelizable boundaries only become visible once a skeleton exists.

**Flip it.** Before any planning doc: init the repo and build a *walking skeleton* — one page, one API route, one table, one migration, one integration test, one E2E test, CI green, **deployed to prod**. Empty app in prod on day one. Otherwise you discover env vars, secrets, build config, connection pooling, and cold starts after 40 features are merged, which is the worst possible time. Then write the plan against real code.

## Parallel agents converge on divergence

"Tabs can be done in parallel" is where this dies. Five agents will each invent their own `Button`, their own fetch wrapper, their own auth hook, their own error shape. You get five working tabs and a codebase nobody can maintain by week two.

Parallelism is only safe *after* a single agent builds and freezes the shared substrate: UI primitives, data access layer, auth, error handling, shared types, test utilities. Agents consume it, never extend it.

And declare **contract files** that parallel agents may not touch — router/nav registration, schema, migrations, lockfile, config. One integrator owns those. Migrations especially: parallel agents produce conflicting migration numbers and incompatible schema assumptions. Serialize schema changes through you.

## TDD with agents is a trap if the same agent writes both sides

An agent writing its own tests writes tests that pass. It will mock the thing under test and report green. Two fixes:

- Acceptance criteria and test cases come from the **issue**, written before the agent starts — ideally by a different pass than the implementer.
- Bias toward **integration tests over unit tests**. Heavy-mocked unit tests are the easiest thing in the world for an agent to fake.

Same logic kills step 1's "document security best practices." A doc does not stop an agent from shipping an unauthenticated endpoint. An authz test does. Every issue touching data gets one.

## The missing step: your review bandwidth is the actual ceiling

Nothing in 1–10 addresses this. Eight agents produce eight PRs. You review them. If you can review three PRs an hour, running eight agents doesn't make you faster — it grows a queue and multiplies merge conflicts.

So: CI must exist before dev starts, as the trust boundary (agents *claim* done; only CI confirms). Typecheck, lint, tests, build all green before a PR reaches your eyes. Keep PRs small. And read the diff, not the PR description — the dangerous agent output is never the broken one, it's the plausible one. Budget real attention for anything touching auth, money, deletion, or permissions.

## QA and E2E are phases; they should be continuous

Step 9 and 10 at the end means you find architectural problems after everything is built, and your E2E suite is written against a large app — slow and flaky from birth. One E2E on the critical path belongs in the skeleton. QA runs per-PR, not as a stage.

Also: "QA agents create new issues" is unbounded issue generation. Put a triage gate in front of it or you'll drown in low-value findings.

## Reordered

1. Lock the hard-to-change decisions: language, framework, DB, auth, hosting.
2. Walking skeleton → CI green → deployed. No parallelism. One agent or you.
3. Shared substrate, single owner, then frozen.
4. *Now* write the journey/plan doc — informed by real code.
5. Review plan → decompose into issues with file-ownership boundaries, acceptance criteria, and tests specified up front.
6. Thin CLAUDE.md + parallel workflow (git worktrees, one agent per issue, PR gates).
7. Fan out. QA per PR. E2E grows with features.
8. Extract skills from runs that actually worked.

Two things you got right that people usually get wrong: skipping skills until you have successful runs to generalize from, and naming dependencies between issues explicitly. On CLAUDE.md — keep it under ~100 lines and make it a list of *invariants agents keep violating*, not a project description. Add a rule only after you see the same mistake twice.
