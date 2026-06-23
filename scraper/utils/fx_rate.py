import os
from datetime import date


def get_zar_per_etb() -> float:
    """How many ETB one South African Rand is worth (Just Property lists Addis rentals in ZAR)."""
    raw = os.getenv("FX_ZAR_ETB") or os.getenv("ZAR_ETB_RATE") or "7.2"
    try:
        rate = float(raw)
        if rate > 0:
            return rate
    except (TypeError, ValueError):
        pass
    return 7.2


def zar_to_etb(zar, zar_per_etb: float | None = None) -> float | None:
    if zar is None:
        return None
    try:
        n = float(zar)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    rate = zar_per_etb or get_zar_per_etb()
    return round(n * rate, 2)


def get_etb_per_usd() -> float:
    raw = os.getenv("FX_ETB_USD") or os.getenv("ETB_USD_RATE") or "130"
    try:
        rate = float(raw)
        if rate > 0:
            return rate
    except (TypeError, ValueError):
        pass
    return 130.0


def today_iso() -> str:
    return date.today().isoformat()


def etb_to_usd(etb, etb_per_usd: float | None = None) -> float | None:
    if etb is None:
        return None
    try:
        n = float(etb)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    rate = etb_per_usd or get_etb_per_usd()
    return round(n / rate, 2)


def apply_usd_pricing(payload: dict) -> dict:
    etb_per_usd = get_etb_per_usd()
    etb = payload.get("price_etb")
    if etb is None:
        etb = payload.get("price")
    usd = payload.get("price_usd")
    if usd is None:
        usd = etb_to_usd(etb, etb_per_usd)
    payload["price_etb"] = etb
    payload["price_usd"] = usd
    payload["fx_rate_etb_usd"] = payload.get("fx_rate_etb_usd") or etb_per_usd
    payload["fx_rate_date"] = payload.get("fx_rate_date") or today_iso()
    payload["currency"] = "USD"
    if payload.get("listing_origin") is None:
        payload["listing_origin"] = "crawled"
    if payload.get("verification_status") is None:
        payload["verification_status"] = "unverified"
    if payload.get("publisher_type") is None:
        payload["publisher_type"] = "unknown"
    if payload.get("is_paid") is None:
        payload["is_paid"] = False
    return payload
