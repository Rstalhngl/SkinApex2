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

# Node 20 + pnpm 11 = crash. corepack often keeps pnpm 11 — force pnpm 9.
corepack disable 2>/dev/null || true
npm install -g pnpm@9.15.9 --silent
hash -r 2>/dev/null || true

PNPM_BIN="$(command -v pnpm)"
PNPM_VER="$("$PNPM_BIN" --version)"
echo "pnpm $PNPM_VER ($PNPM_BIN)"

if [[ "${PNPM_VER%%.*}" -ge 10 ]]; then
  echo "Hata: hâlâ pnpm $PNPM_VER — Node $(node -v) için pnpm 9 gerekli."
  echo "Çalıştır: corepack disable && npm install -g pnpm@9.15.9 && hash -r"
  exit 1
fi

"$PNPM_BIN" install
rm -rf .next
"$PNPM_BIN" build
pm2 restart all
echo "✓ bitti — Ctrl+Shift+R"
