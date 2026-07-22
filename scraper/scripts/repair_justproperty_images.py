#!/usr/bin/env python3
"""
Re-fetch gallery images for Just Property listings that currently have none.

Usage (from scraper/ with DATABASE_URL set):
  python scripts/repair_justproperty_images.py
  python scripts/repair_justproperty_images.py --limit 20
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bs4 import BeautifulSoup  # noqa: E402
from utils.db import USE_POSTGRES, get_connection, _dict_cursor  # noqa: E402

if USE_POSTGRES:
    from psycopg.types.json import Json
else:
    Json = None

ORIGIN = "https://www.just.property"


def extract_images(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    seen: set[str] = set()

    def add(src: str | None) -> None:
        if not src:
            return
        full = urljoin(ORIGIN, src.strip())
        low = full.lower()
        if not (
            "cloudfront.net" in low
            or "/media/uploads/" in low
            or "just.property" in low
            or "/wp-content/" in low
        ):
            return
        if not any(ext in low.split("?")[0] for ext in (".jpg", ".jpeg", ".png", ".webp", ".avif")):
            return
        if any(x in low for x in ("logo", "avatar", "icon", "favicon", "placeholder")):
            return
        if full in seen:
            return
        seen.add(full)
        urls.append(full)

    for a in soup.select("a[href]"):
        add(a.get("href"))
    for img in soup.select("img"):
        for key in ("data-large_image", "data-original", "data-src", "data-lazy-src", "src"):
            add(img.get(key))
        srcset = img.get("srcset") or img.get("data-srcset")
        if srcset:
            for item in srcset.split(","):
                add(item.strip().split(" ")[0])
    for meta_sel in (
        "meta[property='og:image']",
        "meta[property='og:image:url']",
        "meta[name='twitter:image']",
    ):
        el = soup.select_one(meta_sel)
        if el:
            add(el.get("content"))

    return urls[:12]


def fetch_html(url: str) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; MarketMizanImageRepair/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", errors="replace")


def images_empty(raw) -> bool:
    if raw is None:
        return True
    if isinstance(raw, list):
        return len([u for u in raw if isinstance(u, str) and u.strip()]) == 0
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except Exception:
            return True
        return not isinstance(parsed, list) or len(parsed) == 0
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max listings to repair (0 = all)")
    parser.add_argument("--sleep", type=float, default=1.5, help="Seconds between requests")
    args = parser.parse_args()

    if not os.getenv("DATABASE_URL") and not os.getenv("DB_HOST"):
        print("Set DATABASE_URL (or local DB_*) before running.")
        return 1

    conn = get_connection()
    cur = _dict_cursor(conn)
    cur.execute(
        """
        SELECT id, property_id, detail_url, images
        FROM properties
        WHERE is_active = TRUE
          AND source_website = 'just.property'
          AND detail_url IS NOT NULL
        ORDER BY last_seen DESC
        """
    )
    rows = cur.fetchall()
    cur.close()

    todo = [row for row in rows if images_empty(row.get("images"))]
    if args.limit and args.limit > 0:
        todo = todo[: args.limit]

    print(f"Just Property listings needing images: {len(todo)}")
    fixed = 0
    failed = 0
    for i, row in enumerate(todo, 1):
        pid = row["property_id"]
        url = row["detail_url"]
        row_id = row["id"]
        try:
            html = fetch_html(url)
            imgs = extract_images(html)
            if not imgs:
                print(f"[{i}/{len(todo)}] {pid}: no images found")
                failed += 1
            else:
                cur = conn.cursor()
                payload = Json(imgs) if USE_POSTGRES and Json is not None else json.dumps(imgs)
                cur.execute(
                    "UPDATE properties SET images = %s, last_seen = NOW() WHERE id = %s",
                    (payload, row_id),
                )
                conn.commit()
                cur.close()
                print(f"[{i}/{len(todo)}] {pid}: saved {len(imgs)} images")
                fixed += 1
        except Exception as exc:
            print(f"[{i}/{len(todo)}] {pid}: ERROR {exc}")
            failed += 1
        time.sleep(max(0.2, args.sleep))

    print(f"Done. fixed={fixed} failed={failed}")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
