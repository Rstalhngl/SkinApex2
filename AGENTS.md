# AGENTS.md

## Project overview

This repository ships a **SkinApex** CS2 skin marketplace as a **Next.js 16** app inside `cs-2-marketplace-site.2.zip`. The runnable source lives under `extracted/` after unzip (not committed to git). It is a **client-only demo**: mock catalog, in-memory cart/wallet, UI-only Steam login.

## Cursor Cloud specific instructions

### App location

- **Do not** run `pnpm` from the repo root. All commands use **`/workspace/extracted`** (or `cd extracted` from `/workspace`).
- If `extracted/package.json` is missing, extract the archive once:
  `unzip -q -o cs-2-marketplace-site.2.zip -d extracted`

### Services

| Service | Port | Notes |
|---------|------|--------|
| Next.js dev (`pnpm dev`) | 3000 | Only process required for local development |
| `pnpm start` | 3000 | After `pnpm build`; optional prod-like check |

No database, Docker, or backend API. No required `.env` files.

### Commands (from `extracted/`)

See `extracted/package.json` scripts:

- **Dev:** `pnpm dev`
- **Build:** `pnpm build`
- **Prod server:** `pnpm start`
- **Lint:** `pnpm lint` — **currently broken**: `eslint` is referenced in the lint script but is **not** listed in `devDependencies`, so the command fails with `eslint: not found`. Use `pnpm build` as the primary quality gate until ESLint is added.

### Long-running dev server

Use **tmux** for `pnpm dev` (HMR keeps the process alive). Example session name: `nextjs-dev`.

### pnpm build scripts

`pnpm install` may warn that **sharp** build scripts were ignored. Production `pnpm build` still succeeds in this environment without approving interactive `pnpm approve-builds`.

### Manual hello-world check

1. Open http://localhost:3000
2. Add a skin to the cart from the grid
3. Open the cart from the header and confirm the item and checkout affordance

Steam login is a header control (`header.loginSteam`); it toggles client state via `login()` in `site-header.tsx`, not real OAuth.
