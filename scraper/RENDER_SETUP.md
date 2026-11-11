# Render Cron — genaue Einstellungen

Dashboard: **Cron Jobs → market-mizan-scraper**

## 1) Sofort: laufenden teuren Job stoppen

Falls ein Run mit RealEthio/EthiopiaRealty + Proxy läuft → **Cancel**.

## 2) Start Command (Settings → Build & Deploy)

Genau so eintragen (ersetzt den alten `python run_scraper.py --source all`):

```text
PLAYWRIGHT_BROWSERS_PATH=0 bash render-start.sh
```

Damit steuert `SCRAPER_SOURCE` den Lauf — nicht mehr fest `all` in der Command-Zeile.

## 3) Environment (Settings → Environment)

### Empfohlen: einmal einstellen, nie wieder anfassen

| Key | Value |
|-----|-------|
| `SCRAPER_SOURCE` | `auto` |
| `SCRAPER_HARD_DAY` | `1` |
| `SCRAPER_SOFT_SOURCE` | `soft` |
| `SCRAPER_HARD_SOURCE` | `all` |
| `SCRAPER_SKIP_IF_SCRAPED_WITHIN_HOURS` | `336` |
| `SCRAPER_FORCE_RESCRAPE` | `false` |
| `SCRAPER_BROWSER_TEXT_MODE` | `false` |
| `CRAWL4AI_NO_CLOUD_NOTICE` | `1` |

- **Jeden Tag** (außer dem Hard-Tag): `soft` = Just Property + Expat + Hoblen (kein/wenig Decodo).
- **Am `SCRAPER_HARD_DAY` (UTC)**: `all` = inkl. RealEthio / EthiopiaRealty / AddisList (Proxy + CF-Unlock).

Beispiel: `SCRAPER_HARD_DAY=1` → am 1. jedes Monats (UTC) der teure Lauf, sonst günstig.

### Proxy (Decodo) — nur wenn du `hard` / `all` testest

| Key | Value |
|-----|-------|
| `SCRAPER_HTTP_PROXY_USER` | dein Decodo-Username (wie im Dashboard, oft schon mit `user-…`) |
| `SCRAPER_HTTP_PROXY_PASSWORD` | dein Decodo-Passwort |
| `SCRAPER_HTTP_PROXY_HOST` | `gate.decodo.com` |
| `SCRAPER_HTTP_PROXY_PORT` | `10001` |
| `SCRAPER_PROXY_STICKY` | `true` |
| `SCRAPER_PROXY_SESSION_DURATION_MIN` | `90` |

Nicht `SCRAPER_HTTP_PROXY` als volle URL brauchen, wenn USER+PASSWORD gesetzt sind.

### CF-Unlock (für RealEthio / EthiopiaRealty / AddisList)

| Key | Value |
|-----|-------|
| `SCRAPER_CF_UNLOCK` | `true` |
| `SCRAPER_CF_WAIT_MS` | `45000` |
| `SCRAPER_CF_ABORT_AFTER` | `8` |
| `SCRAPER_BROWSER_PROXY_SITES` | `ethiopiarealty,addislist,realethio` |
| `SCRAPER_BROWSER_STEALTH` | `true` |
| `SCRAPER_BROWSER_LIGHT_MODE` | `false` |
| `SCRAPER_BROWSER_AVOID_ADS` | `false` |
| `SCRAPER_BROWSER_AVOID_CSS` | `false` |
| `SCRAPER_BATCH_SIZE` | `1` |
| `SCRAPER_CONCURRENCY` | `1` |

**Wichtig:** `SCRAPER_BROWSER_TEXT_MODE` muss `false` sein. `true` schaltet JS aus → Cloudflare bleibt ewig.

## 4) Was du wann startest

| Ziel | `SCRAPER_SOURCE` | Aktion |
|------|------------------|--------|
| Dauerbetrieb | `auto` | einmal setzen — fertig |
| Sofort nur soft | `soft` | Trigger Run |
| Sofort CF testen | `hard` oder `all` | Trigger Run (Decodo verbraucht) |

Mit `auto` musst du nichts mehr umschalten.

## 5) Erfolg in den Logs

Gut:

- `source=soft` / Pipeline nur justproperty → expat → hoblen
- Bei hard: `CF unlock on (wait_ms=45000, sticky_proxy=True, stealth)`
- `CF cookies synced to HTTP session`
- Details: `Extracted N/M` mit N > 0 (nicht nur Sync)

Schlecht (Cancel + Env prüfen):

- `Cloudflare JS challenge (skipped LLM)` hintereinander
- `circuit breaker tripped`
- lange `HTML discovery page=40…` über Proxy (Sitemap sollte reichen)

## 6) Schedule

Aktuell Dashboard: **08:00 PM UTC** (= 21:00 CET). Passt für Abend-Lauf. Morgens startet nichts von allein.
