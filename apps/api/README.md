# @merchant/api

Fastify 5. All business logic and the REST API (SPEC §3).

## Adding an endpoint = adding a file

Routes autoload from `src/routes/**`; the directory path becomes the URL. There
is no router file to edit, which is why 20 agents can add routes concurrently
without conflicting (CLAUDE.md §3).

```
src/routes/health/index.ts            →  GET /health
src/routes/admin/products/index.ts    →  /admin/api/products
src/routes/storefront/products/…      →  /storefront/api/products
```

## Every handler

```ts
export default async function routes(app: FastifyInstance) {
  app.get('/', { schema: { querystring: listProductsQuery } }, async (request) => {
    const db = request.db;          // tenant-scoped — never import dbAdmin
    return db.product.findMany();
  });
}
```

- **Validate with a contract.** Schemas come from `@merchant/contracts/*`, never
  inline. A route without one is not done (CLAUDE.md §2).
- **`request.db` only.** It is a getter that throws if no shop is resolved, so a
  missing tenant scope fails loudly instead of leaking rows (SPEC §6).
- **Throw, don't hand-build errors.** `notFound('Product')` from `lib/errors.ts`
  produces SPEC §5's error shape automatically.

## Layout

| Path | Purpose | Owner |
|---|---|---|
| `src/plugins/` | cross-cutting: errors, tenancy, auth, rate limits | WS-A |
| `src/lib/` | small shared helpers | WS-A |
| `src/routes/` | the API surface, one directory per resource | per workstream |
| `src/services/` | business logic, one directory per domain | per workstream |
