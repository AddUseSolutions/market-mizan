import logging
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import schedule

from run_scraper import run_source, setup_logger


def configure_file_logger():
    os.makedirs("../logs", exist_ok=True)
    log_file = os.path.join("..", "logs", f"scraper_{datetime.now().strftime('%Y-%m-%d')}.log")
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logging.getLogger().addHandler(file_handler)


def scheduled_job():
    logging.info("📅 Starte geplanten Scrape-Run")
    _, _, _, _, _, _, error = run_source("realethio", test_mode=False)
    if error:
        logging.error("Geplanter Run fehlgeschlagen: %s", error)
    else:
        logging.info("Geplanter Run abgeschlossen")


def main():
    setup_logger()
    configure_file_logger()
    tz = ZoneInfo("Africa/Addis_Ababa")
    schedule.every().day.at("06:00").do(scheduled_job)
    logging.info("Scheduler läuft. Täglicher Run um 06:00 (Africa/Addis_Ababa)")

    while True:
        now = datetime.now(tz)
        next_run = schedule.next_run()
        logging.info("Jetzt: %s | Nächster Run: %s", now.strftime("%Y-%m-%d %H:%M:%S"), next_run)
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
