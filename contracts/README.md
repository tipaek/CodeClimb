# OpenAPI-first workflow

`openapi.yaml` is the source of truth for the API contract.

## How to change the API safely

1. Update `contracts/openapi.yaml` first (paths, request/response schemas, and error responses).
2. Regenerate frontend API types:
   ```bash
   cd frontend
   npm run gen:api
   ```
3. Update backend and frontend implementation code as needed.
4. Run verification:
   ```bash
   cd frontend && npm run verify:api
   make verify-frontend
   make verify-backend
   make verify
   ```

## Drift prevention

- Frontend uses generated types from `frontend/src/api/generated/openapi.ts`.
- `frontend` has `verify:api`, which regenerates and fails if generated output differs from committed code.
- Backend has contract smoke tests to validate key request/response shapes against the OpenAPI contract behavior.
