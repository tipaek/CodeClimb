# CodeClimb Agent Guide

## Code style basics
- Keep changes minimal and scoped to the task.
- Frontend: prefer TypeScript, small components, and explicit script targets in `package.json`.
- Frontend spec: for all frontend changes, follow `docs/UI_SPEC.md`.
- Backend: Java 17, Spring Boot conventions, one top-level class per file.
- Contracts: evolve `contracts/openapi.yaml` first for API-facing work.
- Do not introduce secret-dependent config; everything must run locally with defaults.

## Definition of done
- Required folders remain present: `frontend/`, `backend/`, `contracts/`, `docs/`.
- Verification commands in this file run successfully before handoff.
- New behavior has at least minimal tests or placeholders that execute deterministically.
- If API surface changes, `contracts/openapi.yaml` is updated in the same change.

## Exact verify commands
- `make verify-frontend`
- `make verify-backend`
- `make verify`
