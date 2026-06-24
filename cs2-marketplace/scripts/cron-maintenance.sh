#!/usr/bin/env bash
# SkinApex cron — run on the server every 5 minutes.
#
# Install:
#   cp scripts/cron-maintenance.sh ~/skinapex/cron-maintenance.sh
#   chmod +x ~/skinapex/cron-maintenance.sh
#
# crontab -e:
#   */5 * * * * CRON_SECRET='your_secret' BASE_URL='https://skinapex.net' /home/ubuntu/skinapex/cron-maintenance.sh >> /var/log/skinapex-cron.log 2>&1
#
# Requires in .env.local: CRON_SECRET (or reuse WS_API_KEY)

set -euo pipefail

BASE_URL="${BASE_URL:-https://skinapex.net}"
CRON_SECRET="${CRON_SECRET:?Set CRON_SECRET}"

RESP=$(curl -sS -X POST \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${BASE_URL}/api/internal/cron/expire-sales")

echo "$(date -Is) ${RESP}"
