#!/usr/bin/env bash
# Render Cron Job / manual run entrypoint (Root Directory: scraper).
set -euo pipefail
cd "$(dirname "$0")"

export SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS="${SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS:-336}"
FORCE_ARGS=()
if [[ "${SCRAPER_FORCE_RESCRAPE:-}" =~ ^(1|true|yes)$ ]]; then
  export SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS=0
  FORCE_ARGS+=(--force-rescrape)
  echo "Market Mizan scraper: FORCE RESCRAPE enabled (all details, high OpenAI cost)"
fi

SOURCE="${SCRAPER_SOURCE:-auto}"

if [[ "${SOURCE}" =~ ^(off|none|disabled|stop)$ ]]; then
  echo "Market Mizan scraper: SCRAPER_SOURCE=${SOURCE} — scraper disabled. Exiting."
  exit 0
fi

# auto: soft every day; on SCRAPER_HARD_DAY (UTC, default 1) run all (soft + CF sites).
if [[ "${SOURCE}" =~ ^(auto|schedule)$ ]]; then
  HARD_DAY="${SCRAPER_HARD_DAY:-1}"
  # UTC day-of-month, strip leading zero for numeric compare
  TODAY="$(date -u +%d)"
  TODAY=$((10#${TODAY}))
  HARD_DAY=$((10#${HARD_DAY}))
  if [[ "${TODAY}" -eq "${HARD_DAY}" ]]; then
    SOURCE="${SCRAPER_HARD_SOURCE:-all}"
    echo "Market Mizan scraper: auto → HARD day ${HARD_DAY} UTC → source=${SOURCE}"
  else
    SOURCE="${SCRAPER_SOFT_SOURCE:-soft}"
    echo "Market Mizan scraper: auto → soft day (hard only on UTC day ${HARD_DAY}) → source=${SOURCE}"
  fi
fi

ARGS=(--source "$SOURCE")

if [[ -n "${SCRAPER_LIMIT:-}" ]]; then
  ARGS+=(--limit "$SCRAPER_LIMIT")
fi
if [[ "${SCRAPER_TEST_MODE:-false}" =~ ^(1|true|yes)$ ]]; then
  ARGS+=(--test)
fi
ARGS+=("${FORCE_ARGS[@]}")

if [[ -n "${SCRAPER_HTTP_PROXY:-}${HTTPS_PROXY:-}" ]] \
  || { [[ -n "${SCRAPER_HTTP_PROXY_USER:-}" ]] && [[ -n "${SCRAPER_HTTP_PROXY_PASSWORD:-}" ]]; }; then
  echo "Market Mizan scraper: HTTP proxy configured (sticky=${SCRAPER_PROXY_STICKY:-true})"
else
  echo "Market Mizan scraper: no proxy — soft sources OK; hard CF sites will fail"
fi

if [[ "${SOURCE}" =~ ^(all|hard|cf|cloudflare)$ ]] || [[ "${SOURCE}" == *realethio* ]] \
  || [[ "${SOURCE}" == *ethiopiarealty* ]] || [[ "${SOURCE}" == *addislist* ]]; then
  echo "Market Mizan scraper: CF unlock=${SCRAPER_CF_UNLOCK:-true} wait_ms=${SCRAPER_CF_WAIT_MS:-45000}"
  if [[ "${SCRAPER_BROWSER_TEXT_MODE:-}" =~ ^(1|true|yes)$ ]]; then
    echo "⚠️  SCRAPER_BROWSER_TEXT_MODE=true disables JS — CF challenges cannot clear. Set to false."
  fi
fi

echo "Market Mizan scraper: source=${SOURCE} skip_hours=${SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS} args=${ARGS[*]}"
exec python run_scraper.py "${ARGS[@]}"
