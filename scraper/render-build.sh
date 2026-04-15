#!/usr/bin/env bash
# Render build step when Root Directory is `scraper`.
# Do not use `crawl4ai-setup` here — that CLI is often not on PATH in CI
# even after `pip install crawl4ai`. Installing Chromium via Playwright is enough
# for AsyncWebCrawler + LLM extraction.
set -euo pipefail
cd "$(dirname "$0")"
python -m pip install --upgrade pip
pip install -r requirements.txt
# Prefer system deps for headless Chromium on Linux; fall back if apt is unavailable.
python -m playwright install --with-deps chromium || python -m playwright install chromium
