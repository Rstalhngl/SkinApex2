#!/usr/bin/env bash
set -euo pipefail

# Usage (sunucuda proje klasöründen):
#   pnpm ship                          → main
#   pnpm ship saved-filters             → cursor/saved-filters-13b8
#   pnpm ship cursor/saved-filters-13b8

ARG="${1:-main}"
if [[ "$ARG" == main ]]; then
  BRANCH="main"
elif [[ "$ARG" == cursor/* ]]; then
  BRANCH="$ARG"
else
  BRANCH="cursor/${ARG}-13b8"
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# pnpm 11+ needs Node 22; pin pnpm 9 for Node 20 servers
if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@9.15.9 --activate
else
  npm install -g pnpm@9.15.9
fi

pnpm install
rm -rf .next
pnpm build
pm2 restart all
echo "✓ bitti — Ctrl+Shift+R"
