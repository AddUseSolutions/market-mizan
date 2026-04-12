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
5. **Scraper (optional):** Auf einem Rechner oder als Render Background Worker / Cron: `DATABASE_URL` wie die Produktions-DB setzen, `pip install -r requirements.txt`, dann `python run_scraper.py --source realethio`.

**Go-live kurz:** `/` und `/health` liefern `{"status":"ok"}`; Static Site braucht `VITE_API_URL`; Backend braucht passendes `FRONTEND_URL` (CORS).

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
- `POST /api/admin/run-scraper`
