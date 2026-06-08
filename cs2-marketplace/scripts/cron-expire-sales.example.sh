#!/usr/bin/env bash
# Example cron entry — install on the server, not in the app repo runtime.
# crontab -e
# */5 * * * * /path/to/cron-expire-sales.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://skinapex.net}"
CRON_SECRET="${CRON_SECRET:?Set CRON_SECRET}"

curl -sS -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${BASE_URL}/api/internal/cron/expire-sales"
