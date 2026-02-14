# OpenAPI-first workflow

`contracts/openapi.yaml` is the source of truth for API request/response contracts.

## Update flow

1. Change `contracts/openapi.yaml` first.
2. Regenerate frontend API types:
   ```bash
   cd frontend
   npm run gen:api
   ```
3. Update frontend/backend code as needed.
4. Verify generated output is committed and in sync:
   ```bash
   cd frontend
   npm run verify:api
   ```
5. Run repository verification:
   ```bash
   make verify-frontend
   make verify-backend
   make verify
   ```

## Drift prevention

- Frontend compiles against generated types in `frontend/src/api/generated/schema.ts`.
- CI runs `frontend` `verify:api` to fail when generated files are stale.
- Backend has contract smoke tests that assert key response/request shapes for major endpoints.
