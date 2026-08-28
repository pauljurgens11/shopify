# @merchant/contracts

Zod schemas + inferred types for every API request/response, webhook payload,
theme document, and Pay interface. **This package is the integration contract**
(SPEC §4): it is how a workstream depends on another workstream's work without
waiting for it.

## No barrel file — import subpaths

```ts
import { productSchema } from '@merchant/contracts/products';
import { errorResponseSchema } from '@merchant/contracts/common';
```

There is deliberately no `index.ts`. A barrel would be the single hottest merge
conflict in the repo (every agent appends an export line), and it defeats
tree-shaking in the Next apps.

## One file per domain

`common.ts` is shared and owned by WS-A. Every other file has exactly one owner —
see [docs/WORKSTREAMS.md](../../docs/WORKSTREAMS.md).

## Change rules

- **Adding** a schema, or an **optional/defaulted** field: go ahead, any time.
- **Renaming, retyping, or removing** anything: append to `DECISIONS.md` first,
  then `rg` every usage and fix them in the same PR. Never leave `main` broken.

## Conventions

- Request schemas are named `createXInput`, `updateXInput`, `listXQuery`.
- Response schemas are named `x` (the entity) and `xListResponse`.
- Every list endpoint uses `paginationQuery` and `paginated(schema)` from `common.ts`.
- Money is `moneySchema` — integer minor units, never a float (SPEC §5).
