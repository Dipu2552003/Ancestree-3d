# Ancestree — 3D Family Graph

Interactive 3D view of the Ancestree family graph. Launched from the main app and receives the user session via JWT in the URL hash.

| Environment | URL |
|---|---|
| Production | `https://3d.knownyourancestry.com` |
| Dev (CF preview) | CF Pages preview URL (auto-generated) |

## Stack

| Layer | Tech |
|---|---|
| Build tool | Vite 8 |
| Framework | React 19 |
| 3D engine | Three.js + @react-three/fiber + @react-three/drei |
| State | Zustand |
| Deploy | **Cloudflare Pages** (`public/_redirects` for SPA routing) |

## How auth works

This app has no login screen. The main frontend (`knownyourancestry.com`) passes the JWT as a URL hash on navigation:

```
https://3d.knownyourancestry.com/#token=<jwt>
```

On boot, the app reads `window.location.hash`, extracts the token, and uses it for all API calls. See `src/bootstrapAuth.js`.

## Local development

```bash
npm install
npm run dev    # http://localhost:5173
```

To point at a local backend, create a `.env.local` (gitignored):

```env
VITE_API_URL=http://localhost:4000/api
```

Without this file, the app defaults to `http://localhost:4000/api`.

## Build

```bash
npm run build      # vite build → dist/
npm run preview    # preview the built dist/ locally
```

---

## Deploy to Cloudflare Pages

### Production (branch: `main`)

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. Connect repo `Dipu2552003/Ancestree-3d`, branch `main`
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Settings → Environment variables → **Production** scope:
   - `VITE_API_URL` → `https://api.knownyourancestry.com/api`
5. Deploy
6. Custom domains → add `3d.knownyourancestry.com`
   - Cloudflare adds the DNS record automatically if your domain is on Cloudflare; otherwise add a CNAME manually

### Dev (branch: `dev`)

Cloudflare Pages automatically builds the `dev` branch as a **Preview deployment** (generates a unique `*.pages.dev` URL per push).

To add a stable preview env var for the dev branch:
1. Settings → Environment variables → **Preview** scope:
   - `VITE_API_URL` → `https://dev.api.knownyourancestry.com/api`

> There is no need to set up a separate Pages project — Cloudflare handles both environments from the same project.

---

## SPA routing

`public/_redirects` contains:

```
/*    /index.html    200
```

This tells Cloudflare Pages to serve `index.html` for any path, so client-side routing and the `#token=...` hash handoff always resolve correctly.

---

## Environment variable reference

| Variable | Local | CF Pages prod | CF Pages dev preview |
|---|---|---|---|
| `VITE_API_URL` | `http://localhost:4000/api` | `https://api.knownyourancestry.com/api` | `https://dev.api.knownyourancestry.com/api` |

`VITE_*` vars are baked into the bundle at build time — a redeploy is required to change them.

---

## Branch → environment mapping

| Branch | Deploys to | API |
|---|---|---|
| `main` | `3d.knownyourancestry.com` | `api.knownyourancestry.com` |
| `dev` | CF Pages preview URL | `dev.api.knownyourancestry.com` |
