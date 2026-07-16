#!/usr/bin/env bash
# Render Cron Job / manual run entrypoint (Root Directory: scraper).
set -euo pipefail
cd "$(dirname "$0")"

export SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS="${SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS:-336}"
if [[ "${SCRAPER_FORCE_RESCRAPE:-}" =~ ^(1|true|yes)$ ]]; then
  export SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS=0
fi

SOURCE="${SCRAPER_SOURCE:-off}"

if [[ "${SOURCE}" =~ ^(off|none|disabled|stop)$ ]]; then
  echo "Market Mizan scraper: SCRAPER_SOURCE=${SOURCE} — Just Property crawl disabled. Exiting."
  exit 0
fi

ARGS=(--source "$SOURCE")

if [[ -n "${SCRAPER_LIMIT:-}" ]]; then
  ARGS+=(--limit "$SCRAPER_LIMIT")
fi
if [[ "${SCRAPER_TEST_MODE:-false}" =~ ^(1|true|yes)$ ]]; then
  ARGS+=(--test)
fi

echo "Market Mizan scraper: source=${SOURCE} skip_hours=${SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS} args=${ARGS[*]}"
exec python run_scraper.py "${ARGS[@]}"
