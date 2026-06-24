#!/usr/bin/env bash
set -euo pipefail

# Sunucuda kısayol (önerilen):
#   alias sx='cd ~/skinapex/cs2-marketplace/cs2-marketplace && bash scripts/deploy.sh saved-filters'
#
# Veya: pnpm ship saved-filters

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

# PATH'teki pnpm 11 / corepack karışmasın — her zaman pnpm 9
pnpm() {
  npx --yes pnpm@9.15.9 "$@"
}

echo "pnpm $(pnpm --version) (npx pnpm@9.15.9)"

pnpm install
rm -rf .next
pnpm build
pm2 restart all
echo "✓ bitti — Ctrl+Shift+R"
