# CodeClimb

Leetcode tracker in web form.

## Local development routing (frontend -> backend)

Backend endpoints are rooted at `/` (for example `GET /dashboard`), so frontend requests should target backend origin + root paths.

### Recommended setup (no proxy required)

1. Start backend on `http://localhost:8080`.
2. Start frontend with:

```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

With this setup, frontend calls go directly to `http://localhost:8080/dashboard`, `http://localhost:8080/lists`, etc.

### Optional Vite proxy convenience

If you prefer same-origin API paths in dev, set:

```bash
cd frontend
VITE_API_BASE_URL=/api npm run dev
```

Vite proxies `/api/*` to backend (`http://localhost:8080` by default) and rewrites `/api/dashboard` -> `/dashboard`.
Use `VITE_PROXY_TARGET` to point proxy to another backend URL if needed.
