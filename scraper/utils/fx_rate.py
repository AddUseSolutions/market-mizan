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


def apply_usd_pricing(payload: dict, locked_fx: dict | None = None) -> dict:
    """Normalize price to ETB + USD. Lock FX rates from first_seen on re-scrape when locked_fx is set."""
    locked = locked_fx or {}

    # Just Property: prices already converted via site FX API / USD dropdown.
    if payload.get("price_usd") is not None and payload.get("price_etb") is not None:
        etb = payload.get("price_etb")
        usd = payload.get("price_usd")
        fx_date = locked.get("fx_rate_date") or payload.get("fx_rate_date") or today_iso()
        etb_per_usd = locked.get("fx_rate_etb_usd") or payload.get("fx_rate_etb_usd")
        if etb_per_usd is None and etb and usd:
            try:
                etb_per_usd = round(float(etb) / float(usd), 6)
            except (TypeError, ValueError, ZeroDivisionError):
                etb_per_usd = get_etb_per_usd()
        elif etb_per_usd is None:
            etb_per_usd = get_etb_per_usd()

        payload["price"] = etb
        payload["price_etb"] = etb
        payload["price_usd"] = usd
        payload["fx_rate_etb_usd"] = etb_per_usd
        payload["fx_rate_date"] = fx_date
        if locked.get("fx_rate_zar_usd") is not None:
            payload["fx_rate_zar_usd"] = locked.get("fx_rate_zar_usd")
        if locked.get("fx_rate_zar_etb") is not None:
            payload["fx_rate_zar_etb"] = locked.get("fx_rate_zar_etb")
        payload["currency"] = "ETB"
    else:
        zar_per_etb = locked.get("fx_rate_zar_etb") or payload.get("fx_rate_zar_etb")
        etb_per_usd = locked.get("fx_rate_etb_usd") or payload.get("fx_rate_etb_usd")
        fx_date = locked.get("fx_rate_date") or payload.get("fx_rate_date")

        currency = str(payload.get("currency") or "ETB").upper()
        raw_price = payload.get("price")

        if currency in ("ZAR", "R", "RAND") and raw_price is not None:
            if zar_per_etb is None:
                zar_per_etb = get_zar_per_etb()
            etb = zar_to_etb(raw_price, zar_per_etb)
        else:
            etb = payload.get("price_etb")
            if etb is None:
                etb = raw_price

        if etb_per_usd is None:
            etb_per_usd = get_etb_per_usd()
        if fx_date is None:
            fx_date = today_iso()

        usd = payload.get("price_usd")
        if usd is None:
            usd = etb_to_usd(etb, etb_per_usd)

        payload["price"] = etb
        payload["price_etb"] = etb
        payload["price_usd"] = usd
        payload["fx_rate_zar_etb"] = zar_per_etb
        payload["fx_rate_etb_usd"] = etb_per_usd
        payload["fx_rate_date"] = fx_date
        payload["currency"] = "ETB"

    if payload.get("listing_origin") is None:
        payload["listing_origin"] = "crawled"
    if payload.get("verification_status") is None:
        payload["verification_status"] = "unverified"
    if payload.get("publisher_type") is None:
        payload["publisher_type"] = "unknown"
    if payload.get("is_paid") is None:
        payload["is_paid"] = False
    return payload
