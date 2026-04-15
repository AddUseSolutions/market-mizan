# Market Mizan (mmizan.com)

Vollständiger Immobilien-Aggregator für Addis Ababa mit Frontend (React), Backend (Express + MySQL oder PostgreSQL) und Python-Scraper.

## 1) Lokale Entwicklung starten

### Voraussetzungen
- Node.js 18+
- Python 3.10+
- MySQL 8+ (oder Docker)

### Datenbank starten (lokal: MySQL)
```bash
docker-compose up -d
```
Oder lokal MySQL starten und `backend/db/schema.sql` importieren.

**Produktion (Render & Co.):** PostgreSQL. `DATABASE_URL` setzen, dann einmalig:
```bash
cd backend && npm install && npm run db:migrate
```
Siehe `backend/db/schema.postgres.sql`. Ohne `DATABASE_URL` nutzt das Backend weiter MySQL über `DB_*` (siehe `backend/.env.example`).

### Backend starten
```bash
cd backend
npm install
npm run dev
```

### Frontend starten
```bash
cd frontend
npm install
npm run dev
```

### Scraper-Abhängigkeiten
```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Manuellen Scraper starten
```bash
cd scraper
python run_scraper.py
```

## 3) Scheduler starten
```bash
cd scraper
python scheduler.py
```

## 4) Test-Modus
```bash 
cd scraper
python run_scraper.py --test
```

## 5) Deployment: Render + GitHub + PostgreSQL

Repository: [github.com/AddUseSolutions/market-mizan](https://github.com/AddUseSolutions/market-mizan)

1. **PostgreSQL** auf Render anlegen (oder die Blueprint-DB aus `render.yaml` verwenden).
2. **Backend (Web Service):** Root Directory `backend`, Build `npm install`, Start `npm start`. Umgebungsvariable `DATABASE_URL` mit der Postgres-URL verknüpfen. `FRONTEND_URL` auf die spätere Frontend-URL setzen (CORS).
3. **Einmalig Schema:** In der Render-Shell des Backend-Services: `cd backend && npm run db:migrate`
4. **Frontend (Static Site):** Root Directory `frontend`, Build `npm install && npm run build`, Publish `dist`. **Vor dem Build** `VITE_API_URL` auf die öffentliche Backend-URL setzen (z. B. `https://market-mizan-api.onrender.com`, ohne Pfad `/api`).
5. **Scraper (optional):** Auf einem Rechner oder als **Render Cron Job** / Background Worker:
   - **Root Directory:** `scraper`
   - **Build Command:** `bash render-build.sh`  
     (nicht `crawl4ai-setup` — dieser Befehl fehlt oft im PATH und bricht den Build ab; das Skript installiert Chromium über Playwright.)
   - **Start Command:** `python run_scraper.py --source realethio` (oder `--test` zum Testen)
   - **Environment:** dieselbe `DATABASE_URL` wie das Backend (PostgreSQL) und **`OPENAI_API_KEY`** (für crawl4ai LLM-Extraktion). Optional: `CRAWL4AI_LLM_PROVIDER`, `SCRAPER_CONCURRENCY`.
   - **Python-Version:** bei Problemen mit Paketen **3.12** wählen (nicht unbedingt die neueste 3.14).
   Lokal: nach `pip install -r requirements.txt` einmal `python -m playwright install chromium` ausführen (oder dasselbe wie im Skript).

**Go-live kurz:** `/` und `/health` liefern `{"status":"ok"}`; Static Site braucht `VITE_API_URL`; Backend braucht passendes `FRONTEND_URL` (CORS).

**Kontaktformular (E-Mail):** Anfragen gehen standardmäßig an **mmizan@add-use.ch** (überschreibbar mit `CONTACT_TO_EMAIL`). **Hostpoint:** SMTP-Server `asmtp.mail.hostpoint.ch`, Benutzername = volle E-Mail-Adresse, Port **587** mit `SMTP_SECURE=false` (STARTTLS) oder **465** mit `SMTP_SECURE=true` (SSL). Siehe [Hostpoint: E-mail settings at a glance](https://www.support.hostpoint.ch/en/technical/e-mail/frequently-asked-questions/e-mail-settings-at-a-glance). **`SMTP_PASS` niemals ins Repository** — nur in Render (Environment) oder in `backend/.env` lokal. Vollständige Variablenliste: `backend/.env.example`.

**Login/Auth:** Setze `JWT_SECRET`. Beim Start wird automatisch ein Admin-User erzeugt (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) und kann den Scraper manuell ueber `/admin` ausfuehren.

### VPS / Hostinger (Alternative)

1. Projekt klonen, PostgreSQL oder MySQL bereitstellen
2. `backend/.env`, `frontend/.env`, `scraper/.env` aus den `.env.example`-Dateien ableiten
3. Backend starten, Frontend bauen und ausliefern, Reverse Proxy + TLS wie gewohnt

## 6) Cron-Job Einrichtung

```bash
0 3 * * * python /path/scheduler.py
```

## API Übersicht
- `GET /` und `GET /health` → `{"status":"ok"}`
- `GET /api/properties`
- `GET /api/properties/:property_id`
- `GET /api/properties/featured`
- `GET /api/filters/options`
- `GET /api/sources`
- `GET /api/stats`
- `GET /api/scrape-logs`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/admin/run-scraper` (nur Admin mit Bearer Token)
- `POST /api/contact` — Kontaktanfrage (JSON); sendet E-Mail wenn SMTP konfiguriert ist
