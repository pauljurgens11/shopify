<!-- Keep PRs small: one vertical slice, ~400 lines, mergeable within the hour. -->

**Workstream:** WS-_
**Slice:** <!-- one sentence -->

## Checklist (CLAUDE.md §8)
- [ ] `pnpm verify` green locally
- [ ] Rebased on `origin/main` within the last hour
- [ ] Zod contract for every API boundary touched
- [ ] Every tenant query goes through `dbForShop`
- [ ] New env vars in **both** `env.ts` and `.env.example`
- [ ] Admin UI: Polaris only, plus skeleton / empty state / save bar / toast
- [ ] `DECISIONS.md` appended if anything non-obvious was decided

## Files outside my workstream
<!-- List them and say why. "None" is the expected answer. -->
None
