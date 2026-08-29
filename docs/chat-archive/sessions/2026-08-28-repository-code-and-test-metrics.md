# Repository code and test metrics

| | |
|---|---|
| **Session** | `6ca46870-d4d8-4626-9f0f-25ea1058042d` |
| **Started** | 2026-08-28T16:13:32.648Z |
| **Ended** | 2026-08-28T16:14:06.648Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/busy-mcclintock-c09cfd` |
| **Branch** | `claude/busy-mcclintock-c09cfd` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

how many lines of code in the repo? how many tests

### 🤖 Claude

I'll count both with a couple of shell passes.

🔧 **Bash**
```
git ls-files | wc -l && echo "---TOTAL LINES (all tracked files)---" && git ls-files -z | xargs -0 cat 2>/dev/null | wc -l
```

🔧 **Bash**
```
echo "=== by extension (lines) ===" && git ls-files -z | xargs -0 -n1 sh -c 'ext="${0##*.}"; n=$(wc -l < "$0" 2>/dev/null || echo 0); echo "$ext $n"' 2>/dev/null | awk '{a[$1]+=$2; c[$1]++} END {for (e in a) printf "%-10s %8d lines  %5d files\n", e, a[e], c[e]}' | sort -k2 -rn | head -30
```

> **↳ result**
> ```
> 549
> ---TOTAL LINES (all tracked files)---
>    69831
> ```

> **↳ result**
> ```
> === by extension (lines) ===
> ts            38918 lines    278 files
> tsx           16421 lines    132 files
> md             5202 lines     59 files
> yaml           4617 lines      2 files
> sh             1241 lines      9 files
> sql             932 lines      3 files
> prisma          869 lines     12 files
> json            823 lines     28 files
> yml             347 lines      5 files
> example          66 lines      1 files
> mjs              46 lines      2 files
> gitignore        36 lines      1 files
> githooks/commit-msg       34 lines      1 files
> apps/api/Dockerfile       32 lines      1 files
> apps/worker/Dockerfile       31 lines      1 files
> css              30 lines      1 files
> githooks/pre-push
> … [truncated, 505 more chars]
> ```

🔧 **Bash**
```
cd "$(git rev-parse --show-toplevel)"; echo "=== yaml files ==="; git ls-files '*.yaml' | xargs wc -l; echo; echo "=== test files ==="; git ls-files | grep -E '\.(test|spec)\.(ts|tsx)$|(^|/)e2e/' | grep -E '\.(ts|tsx)$' | xargs wc -l | tail -1; echo; echo "--- list ---"; git ls-files | grep -E '\.(test|spec)\.(ts|tsx)$|(^|/)e2e/.*\.(ts|tsx)$' | xargs wc -l | sort -rn | head -50
```

> **↳ result**
> ```
> === yaml files ===
>     4613 pnpm-lock.yaml
>        4 pnpm-workspace.yaml
>     4617 total
> 
> === test files ===
>    13243 total
> 
> --- list ---
>    13243 total
>      754 apps/api/test/collections.test.ts
>      752 apps/api/test/checkout.test.ts
>      653 packages/pay/src/router.test.ts
>      615 apps/api/test/storefront.test.ts
>      532 apps/api/src/services/discounts/engine.test.ts
>      506 packages/db/prisma/seed/seed.test.ts
>      499 apps/api/test/orders.test.ts
>      482 apps/api/test/auth.test.ts
>      461 apps/api/test/products.test.ts
>      408 apps/api/test/inventory.test.ts
>      362 apps/api/test/fulfillment-refund.test.ts
>      354 apps/api/test/payments.test.ts
>      332 apps/api/test/customers.tes
> … [truncated, 1,718 more chars]
> ```

🔧 **Bash**
```
cd "$(git rev-parse --show-toplevel)"; echo "=== test case counts ==="; files=$(git ls-files | grep -E '\.(test|spec)\.(ts|tsx)$'); echo "unit/integration test files: $(echo "$files" | wc -l)"; echo "it()/test() cases: $(echo "$files" | xargs grep -hoE '\b(it|test)(\.(only|skip|concurrent|each))?\s*\(' | wc -l)"; echo "describe() blocks: $(echo "$files" | xargs grep -hoE '\bdescribe(\.(only|skip))?\s*\(' | wc -l)"; echo; e2e=$(git ls-files 'e2e/**' | grep -E '\.(ts|tsx)$'); echo "e2e files: $(echo "$e2e" | wc -l)"; echo "e2e test() cases: $(echo "$e2e" | xargs grep -hoE '\btest(\.(only|skip|de
… [truncated, 25 more chars]
```

> **↳ result**
> ```
> === test case counts ===
> unit/integration test files:       58
> it()/test() cases:      685
> describe() blocks:      193
> 
> e2e files:        3
> e2e test() cases:        7
> ```

🔧 **Bash**
```
cd "$(git rev-parse --show-toplevel)"; grep -nE '^\s*test(\.describe)?\(' e2e/tests/*.ts | sed 's/{.*//'
```

> **↳ result**
> ```
> e2e/tests/smoke.spec.ts:26:test.describe('mandatory smoke flows', () => 
> e2e/tests/smoke.spec.ts:27:  test('a) staff login → create product with 2 variants → appears in list', async (
> e2e/tests/smoke.spec.ts:77:  test('b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund', async (
> e2e/tests/smoke.spec.ts:125:  test('c) discount code applies at checkout', async (
> e2e/tests/smoke.spec.ts:144:  test('d) AI builder: apply preset → publish → storefront reflects it', async (
> e2e/tests/smoke.spec.ts:185:  test('e) second shop signup is isolated from the demo shop', async (
> e2e/tests/smoke.spec.ts:224:test('skeleton: api answers /health', async (
> ```

### 🤖 Claude

## Lines of code

| Scope | Lines |
|---|---|
| **All tracked files** | 69,831 across 549 files |
| Minus `pnpm-lock.yaml` (4,613) | **65,218** |
| **TypeScript source** (`.ts` + `.tsx`) | **55,339** across 410 files |
| — app/lib code (non-test) | ~42,100 |
| — test code | **13,243** across 61 files |
| Docs (`.md`) | 5,202 (59 files) |
| Prisma schema + SQL migrations | 1,801 |
| Shell / config / Dockerfiles | ~1,600 |

So roughly **55k lines of TypeScript**, of which **~24% is tests**.

## Tests

| | Count |
|---|---|
| Unit/integration test files (`*.test.ts(x)`) | 58 |
| `it()` / `test()` cases | **685** |
| `describe()` blocks | 193 |
| Playwright e2e spec files | 1 (+2 helper/config) |
| Playwright test cases | **6** (the 5 mandatory smoke flows a–e, plus a `/health` skeleton check) |

**Total ≈ 691 executable test cases.** The heaviest suites are [collections.test.ts](apps/api/test/collections.test.ts) (754), [checkout.test.ts](apps/api/test/checkout.test.ts) (752), and [router.test.ts](packages/pay/src/router.test.ts) (653) — the Pay routing tests, discount engine, and tenancy suite from SPEC §14 are all present.
