# SkinApex CS2 Marketplace

Next.js marketplace for buying and selling CS2 skins with wallet balance, P2P or trade-bot delivery, offers, and admin tools.

## Development

```bash
cd cs2-marketplace
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000

## Required environment (production)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (required in production) |
| `SESSION_SECRET` | Session cookie signing |
| `NEXT_PUBLIC_BASE_URL` | Public site URL |
| `ALLOWED_AUTH_ORIGINS` | Steam OAuth redirect allowlist |
| `ADMIN_STEAM_IDS` | Comma-separated admin Steam IDs |

See `.env.example` for optional: WebSocket, cron, trade bot, email, withdrawals.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm check:prod` | Preflight env validation |
| `pnpm test` | Run unit tests |
| `pnpm trade-bot` | Steam trade bot worker |
| `pnpm ws-server` | WebSocket live sync |
| `pnpm ship saved-filters` | Deploy script alias |

## Deploy (server)

```bash
bash scripts/deploy.sh saved-filters
```

Runs production preflight, build, and `pm2 restart all`.

## Health

- `GET /api/health` — config checklist (no secrets)
- Cron: `scripts/cron-expire-sales.example.sh`

## Trade bot mode

When `TRADE_BOT_ENABLED=true`:

1. Seller creates listing → status `pending_deposit`
2. Seller sends item to bot (`STEAM_BOT_TRADE_URL`)
3. Bot worker accepts deposit → listing goes `active`
4. On purchase, bot sends offer to buyer automatically

Run bot: `pnpm trade-bot` (PM2: `skinapex-trade-bot` in `ecosystem.config.cjs`)

## Email notifications

Optional — configure one of:

- `RESEND_API_KEY` + `EMAIL_FROM`
- `EMAIL_WEBHOOK_URL` (JSON POST with `{ to, subject, text }`)
- `ADMIN_EMAIL` for admin alerts

In-app notifications always work; email sends when user profile has an email.
