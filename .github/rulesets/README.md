# Branch rulesets

Committed so branch protection is reviewable and reproducible instead of living
only in the GitHub UI.

**Apply (first time):**
```bash
gh api -X POST /repos/pauljurgens11/shopify/rulesets --input .github/rulesets/main.json
```

**Update:**
```bash
gh api /repos/pauljurgens11/shopify/rulesets --jq '.[] | "\(.id)\t\(.name)"'
gh api -X PUT /repos/pauljurgens11/shopify/rulesets/<id> --input .github/rulesets/main.json
```

- `main.json` — start here. No merge queue; PRs merge in parallel.
- `main-with-merge-queue.json` — same, plus a merge queue. Switch to it when
  semantic conflicts start reaching `main` (see docs/PARALLEL-AGENTS.md §4).
  Requires `merge_group:` in the `pr-checks` workflow triggers — it is already there.

The required check context `pr-checks` must match the **job name** in
`.github/workflows/pr-checks.yml`. Rename one, rename the other.
