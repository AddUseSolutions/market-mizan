"""just.property live FX — same API the React currency dropdown uses."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import requests

from utils.helpers import parse_number

logger = logging.getLogger(__name__)

CURRENCY_API = os.getenv(
    "JUSTPROPERTY_CURRENCY_API",
    "https://tuhqtbfkx8.execute-api.us-east-1.amazonaws.com/staging/currency-converter",
)

# Click react-select ZAR → USD (same as user choosing USD in the dropdown).
SWITCH_CURRENCY_TO_USD_JS = """
(() => {
  const control = document.querySelector('.react-select__control');
  if (!control) return;
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  control.click();
  setTimeout(() => {
    const opts = document.querySelectorAll('[class*="react-select__option"]');
    for (const el of opts) {
      if ((el.textContent || '').trim().toUpperCase() === 'USD') {
        el.click();
        break;
      }
    }
  }, 400);
})();
"""

WAIT_FOR_USD_SELECTED = (
    "js:() => (document.querySelector('.react-select__single-value')?.textContent || '').trim() === 'USD'"
)


def _api_get(amount: float, from_ccy: str, to_ccy: str, timeout: float = 20.0) -> dict[str, Any]:
    resp = requests.get(
        CURRENCY_API,
        params={"amount": amount, "from": from_ccy.upper(), "to": to_ccy.upper()},
        timeout=timeout,
    )
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, dict):
        raise ValueError(f"unexpected currency API response: {data!r}")
    return data


def _timestamp_to_date(ts: Any) -> str:
    try:
        n = int(ts)
        return datetime.fromtimestamp(n, tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError, OSError):
        return datetime.now(timezone.utc).date().isoformat()


def convert_listing_prices(
    zar_amount: float,
    *,
    display_usd: float | None = None,
    locked_zar_usd: float | None = None,
    locked_etb_per_usd: float | None = None,
    locked_fx_date: str | None = None,
) -> dict[str, Any]:
    """
    USD from dropdown/site (ZAR→USD), then ETB from that USD (USD→ETB) — same chain as the UI.
    """
    if zar_amount <= 0:
        raise ValueError("zar_amount must be positive")

    if locked_zar_usd is not None and locked_etb_per_usd is not None:
        usd = round(float(display_usd), 2) if display_usd and display_usd > 0 else round(
            zar_amount * float(locked_zar_usd), 2
        )
        etb = round(usd * float(locked_etb_per_usd), 2)
        return {
            "price_usd": usd,
            "price_etb": etb,
            "fx_rate_zar_usd": float(locked_zar_usd),
            "fx_rate_etb_usd": float(locked_etb_per_usd),
            "fx_rate_date": locked_fx_date,
            "source_price_zar": zar_amount,
        }

    fx_date = None
    zar_usd_rate = None

    if display_usd is not None and display_usd > 0:
        usd = round(float(display_usd), 2)
    else:
        usd_data = _api_get(zar_amount, "ZAR", "USD")
        usd = round(float(usd_data.get("converted") or 0), 2)
        zar_usd_rate = float(usd_data.get("rate") or 0)
        fx_date = _timestamp_to_date(usd_data.get("timestamp"))

    etb_data = _api_get(usd, "USD", "ETB")
    etb = round(float(etb_data.get("converted") or 0), 2)
    etb_per_usd = float(etb_data.get("rate") or 0)
    if fx_date is None:
        fx_date = _timestamp_to_date(etb_data.get("timestamp"))

    if zar_usd_rate is None and zar_amount > 0:
        zar_usd_rate = usd / zar_amount

    return {
        "price_usd": usd,
        "price_etb": etb,
        "fx_rate_zar_usd": zar_usd_rate,
        "fx_rate_etb_usd": etb_per_usd,
        "fx_rate_date": fx_date,
        "source_price_zar": zar_amount,
    }


def extract_usd_from_display_price(soup) -> Optional[float]:
    """Read USD from visible price after the dropdown was switched (e.g. $1,177 pm)."""
    from utils.helpers import clean_text

    for el in soup.select(".price, [class*='price']"):
        text = clean_text(el.get_text(" ", strip=True) or "")
        if not text or "$" not in text:
            continue
        val = parse_number(text)
        if val is not None and val > 0:
            return val
    return None


def apply_site_converted_prices(
    payload: dict,
    zar_amount: float | None,
    *,
    display_usd: float | None = None,
    locked_fx: dict | None = None,
) -> dict:
    """USD from dropdown; ETB = site API USD→ETB on that USD amount."""
    if zar_amount is None or zar_amount <= 0:
        return payload

    locked = locked_fx or {}
    try:
        converted = convert_listing_prices(
            zar_amount,
            display_usd=display_usd,
            locked_zar_usd=locked.get("fx_rate_zar_usd"),
            locked_etb_per_usd=locked.get("fx_rate_etb_usd"),
            locked_fx_date=locked.get("fx_rate_date"),
        )
    except Exception as exc:
        logger.warning("just.property currency API failed: %s", exc)
        return payload

    payload["source_price_zar"] = zar_amount
    payload["price"] = converted["price_etb"]
    payload["price_etb"] = converted["price_etb"]
    payload["price_usd"] = converted["price_usd"]
    payload["fx_rate_zar_usd"] = converted["fx_rate_zar_usd"]
    payload["fx_rate_etb_usd"] = converted["fx_rate_etb_usd"]
    payload["fx_rate_date"] = converted["fx_rate_date"]
    payload["currency"] = "ETB"
    return payload
