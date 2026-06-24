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
    rate = float(zar_per_etb) if zar_per_etb is not None else get_zar_per_etb()
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
    rate = float(etb_per_usd) if etb_per_usd is not None else get_etb_per_usd()
    return round(n / rate, 2)


def _is_just_property(payload: dict) -> bool:
    return str(payload.get("source_website") or "").lower() == "just.property"


def _float_or_none(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _default_zar_usd_rate() -> float:
    raw = os.getenv("FX_ZAR_USD") or "0.055"
    try:
        rate = float(raw)
        if rate > 0:
            return rate
    except (TypeError, ValueError):
        pass
    return 0.055


def _is_stale_zar_usd_rate(rate) -> bool:
    r = _float_or_none(rate)
    if r is None or r <= 0:
        return True
    default = _default_zar_usd_rate()
    if abs(r - default) < 0.0001:
        return True
    return r < 0.04 or r > 0.12


def _resolve_jp_zar_amount(payload: dict) -> float | None:
    zar = _float_or_none(payload.get("source_price_zar"))
    if zar and zar > 0:
        return zar

    etb = _float_or_none(payload.get("price_etb"))
    usd = _float_or_none(payload.get("price_usd"))
    zar_usd = _float_or_none(payload.get("fx_rate_zar_usd"))

    if _is_corrupt_jp_pricing(payload):
        if etb and usd and usd > 0:
            if zar_usd and zar_usd > 0:
                inferred = round(usd / zar_usd, 2)
                if inferred > 0 and (not etb or inferred < etb):
                    return inferred
            if etb > 0 and etb < 100000:
                return etb

    for key in ("price", "price_usd"):
        candidate = _float_or_none(payload.get(key))
        if candidate and candidate > 0:
            return candidate
    return None


def _is_corrupt_jp_pricing(payload: dict) -> bool:
    """ZAR stored as ETB with USD = ETB / fx_rate_etb_usd only."""
    etb = _float_or_none(payload.get("price_etb"))
    usd = _float_or_none(payload.get("price_usd"))
    if not etb or not usd or etb <= 0 or usd <= 0:
        return False
    etb_per_usd = _float_or_none(payload.get("fx_rate_etb_usd")) or get_etb_per_usd()
    return abs(etb / usd - etb_per_usd) < 5


def _jp_needs_price_fix(row: dict) -> bool:
    if not row:
        return False
    payload = {
        "price_etb": row.get("price_etb"),
        "price_usd": row.get("price_usd"),
        "fx_rate_etb_usd": row.get("fx_rate_etb_usd"),
        "fx_rate_zar_usd": row.get("fx_rate_zar_usd"),
    }
    if _is_corrupt_jp_pricing(payload):
        return True
    zar_usd = _float_or_none(row.get("fx_rate_zar_usd"))
    return _is_stale_zar_usd_rate(zar_usd)


def apply_usd_pricing(payload: dict, locked_fx: dict | None = None) -> dict:
    """Normalize price to ETB + USD. Lock FX rates from first_seen on re-scrape when locked_fx is set."""
    locked = locked_fx or {}

    has_both = payload.get("price_usd") is not None and payload.get("price_etb") is not None
    if has_both and not (_is_just_property(payload) and _is_corrupt_jp_pricing(payload)):
        etb = payload.get("price_etb")
        usd = payload.get("price_usd")
        fx_date = locked.get("fx_rate_date") or payload.get("fx_rate_date") or today_iso()
        etb_per_usd = _float_or_none(locked.get("fx_rate_etb_usd")) or _float_or_none(payload.get("fx_rate_etb_usd"))
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
        zar_per_etb = _float_or_none(locked.get("fx_rate_zar_etb")) or _float_or_none(payload.get("fx_rate_zar_etb"))
        etb_per_usd = _float_or_none(locked.get("fx_rate_etb_usd")) or _float_or_none(payload.get("fx_rate_etb_usd"))
        fx_date = locked.get("fx_rate_date") or payload.get("fx_rate_date")

        currency = str(payload.get("currency") or "ETB").upper()
        raw_price = payload.get("price")

        if _is_just_property(payload):
            zar_f = _resolve_jp_zar_amount(payload)
            if zar_f and zar_f > 0:
                from utils.justproperty_currency import apply_site_converted_prices

                use_locked = locked if not _is_corrupt_jp_pricing(payload) and not _is_stale_zar_usd_rate(
                    locked.get("fx_rate_zar_usd")
                ) else None
                apply_site_converted_prices(payload, zar_f, locked_fx=use_locked)
                etb = payload.get("price_etb")
                usd = payload.get("price_usd")
            else:
                etb = payload.get("price_etb")
                if etb is None:
                    etb = raw_price
                usd = payload.get("price_usd")
        elif currency in ("ZAR", "R", "RAND") and raw_price is not None:
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
