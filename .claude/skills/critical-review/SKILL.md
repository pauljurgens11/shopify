---
name: critical-review
description: Audit ONE named scope in depth — a workstream, module, directory, feature, branch or PR — and report severity-ranked findings in chat. Read-only: it finds and explains, it does not fix. Use for "review workstream D", "audit the payments module", "is this code solid?", "be critical about X", "look over this PR". If no scope is named and the subject is the project as a whole ("how is it going", "look at the repo"), use repo-review. To build an issue rather than judge one, use resolve-issue.
---

# Critical code review

Audit the one scope the user named, as deeply as you can, and deliver the findings
in chat. You are a principal engineer who did not write this code and has no stake
in it looking good. Find what is wrong, risky, or unfinished — do not summarize
what exists.

**This skill vs the others:** `critical-review` goes *deep on one scope* and only
reports. [`repo-review`](../repo-review/SKILL.md) goes *wide across the whole
build*, drives the app in a browser, and lands small fixes itself.
[`resolve-issue`](../resolve-issue/SKILL.md) builds an issue into a merged PR.

**The bar:** every finding cites `file:line`, survived your own attempt to refute
it, and names what breaks. Three verified criticals beat thirty maybes.

Read [CLAUDE.md](../../../CLAUDE.md) and [SPEC.md](../../../SPEC.md) for the rules
this code is judged against, [DECISIONS.md](../../../DECISIONS.md) for what is
already settled, and for anything with a screen,
[docs/issues/PARITY.md](../../../docs/issues/PARITY.md).

Calibrate before starting: expectations: a review that surfaces no significant findings in any real codebase is almost certainly a shallow review. If you come up empty, dig deeper before concluding the code is clean. Assume the authors were competent but under time pressure — the likely defects are boundary violations, unhandled edge cases, copy-paste drift between similar code paths, and invariants that hold only on the happy path.

## 1. Resolve the scope — don't assume it

1. Identify the exact files/directories in scope from the user's request. If the project has ownership or architecture docs (e.g. a workstreams map, CODEOWNERS, module docs), use them to resolve a named scope like "workstream D" into concrete paths. If the scope is a PR or branch, the diff plus every file the diff touches is the surface.
2. Identify the source of truth for intended behavior: a spec, requirements doc, ticket, or API contract. Review the code against that, not against what the code appears to be trying to do. If no spec exists, state the behavior you inferred and flag that inference as a review limitation in the final report.
3. Read the project's stated conventions (CLAUDE.md, CONTRIBUTING, lint config) and any decision log. A documented decision is settled — don't relitigate it, but DO flag code that contradicts it.
4. Include the scope's edits *outside* its own directories: shared types, schema/migration changes, config, and anything other components consume. Cross-boundary edits are where multi-author codebases rot.

## 2. Method — evidence over impression

- Read the actual code. Never infer behavior from file names, comments, types, or docstrings alone.
- For every candidate finding, attempt to REFUTE it before reporting: re-read the code path, check the callers, check whether a wrapper/middleware/framework already handles it. Only findings that survive your own refutation attempt go in the report. This trades a little recall for a lot of precision — a report full of plausible-but-wrong findings destroys trust in the real ones.
- Trace the 3–5 most important end-to-end flows in scope, from entry point (request, event, job, CLI invocation) to persistence/side effect and back — including the failure branches, not just the happy path. Name the flows you traced in the report.
- Run what you can: build, typecheck, linter, the test suite for the scope. Inspect real data/fixtures where the code makes assumptions about data shape.
- Every finding must cite `file:line` and include either a concrete failure scenario ("input X in state Y → Z happens") or the exact spec/convention clause violated. No finding without evidence. No "consider…" advice without a stated consequence.

## 3. Review dimensions — check every one

1. **Correctness vs intent.** Required behavior that is missing, wrong, or silently degraded. State machines that can reach invalid states. Off-by-one, null/undefined, and empty-collection handling. Idempotency of anything that can be retried.
2. **Boundary and contract integrity.** Input validation at every trust boundary (params, query, body, headers, messages — not just the obvious one). Consistency between declared types/schemas and actual runtime shapes. Error handling that swallows, mislabels, or leaks. Responses conforming to the project's API contract.
3. **Data integrity.** Arithmetic on money/quantities/time done safely (precision, rounding, units, timezones). Multi-step writes that must be atomic but aren't. Reconciliation: do derived totals provably match their parts?
4. **Concurrency and partial failure.** Read-modify-write races. External-call-then-write sequences that leave inconsistent state when step two fails. Retries that double-apply. Missing timeouts, unbounded queues, resources not released on the error path.
5. **Security (proportionate to the project's stated bar).** Authn/authz on every entry point; authorization checked against the *resource owner*, not just "logged in" (IDOR). Secrets or sensitive data in logs, errors, or URLs. Injection at every place user input meets an interpreter (SQL, shell, HTML, paths).
6. **Isolation boundaries** (if multi-tenant, multi-user, or multi-account): can any code path read or write data across the boundary — including via guessed IDs, nested writes, background jobs, or caches keyed without the tenant?
7. **UI/UX wiring** (if UI is in scope): dead controls, stubs that throw, loading/empty/error states missing, client state that desyncs from the server after mutation.
8. **Blast radius.** Changes to shared code, schemas, or contracts made without updating all consumers. Anything another team or component will trip over.

## 4. What NOT to report

Style and formatting the linter owns; test-coverage ambitions beyond what the project mandates; hardening beyond the project's stated security bar; performance micro-optimizations without a measured or obvious cost; anything the project explicitly declares out of scope. Do not praise the code. Do not pad the report — three verified criticals beat thirty maybes. This section matters as much as the checklist above: without it, reviews fill with noise the project has explicitly deprioritized, and the signal drowns.

## 5. Output — in chat, nowhere else

Deliver the full report **directly in the chat response**. Do not write it to a file, do not create a report document, do not save findings anywhere on disk — the chat message IS the deliverable. Findings mentioned only in intermediate notes or tool output don't count; everything must appear in the final response.

Order findings by severity. For each finding:

**[SEV] Title** — `file:line`
- **What**: one-sentence defect statement.
- **Evidence**: the failing scenario or violated clause, concrete enough to reproduce.
- **Fix**: the minimal correct change (direction, not a full patch).

Severity scale:
- **CRITICAL** — data loss/corruption, isolation breach, security hole, crash on a primary flow.
- **HIGH** — user-visible spec violation, broken invariant, corruption possible on a plausible path.
- **MEDIUM** — convention violation with cross-team cost, or an edge-case bug unlikely to surface soon.
- **LOW** — real but tolerable given the project's stated priorities.

End the report with three lists: (a) the flows you traced, (b) the checks you ran with their actual output, (c) what you could NOT verify and why — unverified is not the same as passing, and saying so is part of an honest review.

---

## Checklist

- [ ] Scope resolved to concrete paths, including its edits *outside* its own directories
- [ ] Judged against the spec/contract, not against what the code seems to intend
- [ ] DECISIONS.md read — nothing settled got relitigated, contradictions flagged
- [ ] 3–5 end-to-end flows traced through their failure branches, and named in the report
- [ ] Every finding survived a refutation attempt; every one cites `file:line`
- [ ] Checks actually run, with real output quoted
- [ ] Nothing reported that §14 forbids, that §2 puts out of scope, or that exceeds the §15 security bar
- [ ] Report delivered in chat, severity-ordered, ending with flows traced / checks run / what you could not verify
