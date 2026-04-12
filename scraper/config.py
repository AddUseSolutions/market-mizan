import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def env_or_default(key, fallback):
    value = os.getenv(key)
    return value if value is not None and str(value).strip() != "" else fallback

# Wenn DATABASE_URL gesetzt ist (PostgreSQL, z. B. Render), nutzt der Scraper diese Verbindung.
# Sonst MySQL über DB_* (lokal / Docker).
DB_CONFIG = {
    "host": env_or_default("DB_HOST", "localhost"),
    "port": int(env_or_default("DB_PORT", 3306)),
    "database": env_or_default("DB_NAME", "market_mizan"),
    "user": env_or_default("DB_USER", "root"),
    # Lokaler Fallback, falls .env leer ist.
    "password": env_or_default("DB_PASSWORD", "root"),
}

SCRAPER_SLEEP_MIN = int(os.getenv("SCRAPER_SLEEP_MIN", 3))
SCRAPER_SLEEP_MAX = int(os.getenv("SCRAPER_SLEEP_MAX", 8))
SCRAPER_TEST_MODE = os.getenv("SCRAPER_TEST_MODE", "false").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "uploads", "images"))
LOG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "logs"))
