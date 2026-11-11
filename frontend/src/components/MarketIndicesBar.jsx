import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container, SegmentedControl } from "./ui";

/** Site palette: primary blue + navy from the map color concept. */
const BOARD = "#0b1220";
const NAVY = "#002060";
const PRIMARY = "#2563eb";
const PILL = "#1e293b";
const CURRENCY_KEY = "mm-index-currency";

function formatPps(n, currency, fx) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const usd = Number(n);
  if (currency === "ETB") {
    const etb = usd * (Number(fx) || 0);
    if (!etb) return "—";
    return `ETB ${etb.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  const digits = usd >= 100 ? 0 : 2;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

function formatMom(pct) {
  return `${Math.abs(Number(pct) * 100).toFixed(1)}%`;
}

function MomBadge({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  if (Math.abs(Number(pct)) < 0.0005) return null;
  const up = Number(pct) > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {formatMom(pct)}
    </span>
  );
}

function TickerPill({ item, mode, typeGroup, currency, fx }) {
  return (
    <Link
      to={`/?area=${encodeURIComponent(item.district)}&listing_mode=${mode === "sale" ? "for_sale" : "for_rent"}&property_type_group=${typeGroup}`}
      className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-white transition-colors hover:brightness-110"
      style={{ backgroundColor: PILL }}
      title={`${item.district}: ${formatPps(item.avgPpsUsd, currency, fx)} per m²`}
    >
      <span className="text-xs font-medium text-white/90">{item.district}</span>
      <span className="text-xs font-bold tabular-nums text-white">{formatPps(item.avgPpsUsd, currency, fx)}</span>
      <MomBadge pct={item.momPpsPct} />
    </Link>
  );
}

function beltItems(items) {
  if (!items.length) return [];
  const out = [];
  while (out.length < 12) out.push(...items);
  return out;
}

function TickerLane({ items, mode, typeGroup, direction, currency, fx }) {
  if (!items.length) return <div className="min-w-0 flex-1" />;
  const belt = beltItems(items);
  const loop = [...belt, ...belt];
  const durationSec = Math.max(belt.length * 2.8, 28);
  const anim = direction === "ltr" ? "ticker-rtl" : "ticker-ltr";

  return (
    <div className="min-w-0 flex-1 overflow-hidden py-1">
      <div
        className="flex w-max gap-2 will-change-transform"
        style={{ animation: `${anim} ${durationSec}s linear infinite` }}
      >
        {loop.map((item, index) => (
          <TickerPill
            key={`${mode}-${typeGroup}-${currency}-${index}`}
            item={item}
            mode={mode}
            typeGroup={typeGroup}
            currency={currency}
            fx={fx}
          />
        ))}
      </div>
    </div>
  );
}

function LaneRow({ to, label, unit, items, mode, typeGroup, direction, currency, fx }) {
  return (
    <div className="flex min-h-[3.1rem] min-w-0 items-center gap-3 border-b border-white/5 px-3 last:border-b-0 sm:min-h-[3.35rem] sm:px-4">
      <Link to={to} className="w-[5.75rem] shrink-0 sm:w-32">
        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:text-xs">{label}</span>
        <span className="mt-0.5 block text-[10px] text-white/45">{unit}</span>
      </Link>
      <TickerLane items={items} mode={mode} typeGroup={typeGroup} direction={direction} currency={currency} fx={fx} />
    </div>
  );
}

function ModeRail({ label, accent }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 sm:flex-col sm:justify-center sm:gap-2 sm:px-2 sm:py-3" style={{ backgroundColor: NAVY }}>
      <span className="h-0.5 w-5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white sm:text-[11px] sm:[writing-mode:vertical-rl] sm:rotate-180">
        {label}
      </span>
    </div>
  );
}

function readSavedCurrency() {
  try {
    const v = localStorage.getItem(CURRENCY_KEY);
    if (v === "ETB" || v === "USD") return v;
  } catch {
    /* ignore */
  }
  return "USD";
}

/** Dark Mizan Index board — USD/ETB toggle, four live district belts. */
export default function MarketIndicesBar() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [fx, setFx] = useState(161);
  const [currency, setCurrency] = useState(readSavedCurrency);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "mm-market-ticker-v4";
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          (parsed.rentApartment?.length ||
            parsed.rentHouse?.length ||
            parsed.saleApartment?.length ||
            parsed.saleHouse?.length)
        ) {
          setData(parsed);
          if (parsed.fxRateEtbPerUsd) setFx(Number(parsed.fxRateEtbPerUsd));
        }
      }
    } catch {
      /* ignore */
    }

    api
      .get("/market-ticker", { timeout: 25000 })
      .then((response) => {
        if (cancelled) return;
        const body = response.data || {};
        const next = {
          rentApartment: Array.isArray(body.rentApartment) ? body.rentApartment : body.rent || [],
          rentHouse: Array.isArray(body.rentHouse) ? body.rentHouse : [],
          saleApartment: Array.isArray(body.saleApartment) ? body.saleApartment : body.sale || [],
          saleHouse: Array.isArray(body.saleHouse) ? body.saleHouse : [],
          fxRateEtbPerUsd: body.fxRateEtbPerUsd
        };
        if (
          !next.rentApartment.length &&
          !next.rentHouse.length &&
          !next.saleApartment.length &&
          !next.saleHouse.length
        ) {
          return;
        }
        setData(next);
        if (next.fxRateEtbPerUsd) setFx(Number(next.fxRateEtbPerUsd));
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* keep cached */
      });

    api
      .get("/fx", { timeout: 10000 })
      .then((response) => {
        if (cancelled) return;
        const rate = Number(response.data?.etbPerUsd);
        if (Number.isFinite(rate) && rate > 0) setFx(rate);
      })
      .catch(() => {
        /* keep default / ticker fx */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function onCurrencyChange(next) {
    setCurrency(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const monthLabel = useMemo(() => {
    const key = data?.currentMonth;
    if (key && /^\d{4}-\d{2}$/.test(key)) {
      const [y, m] = key.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      });
    }
    return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [data?.currentMonth]);

  if (!data) return null;
  const hasRent = data.rentApartment.length > 0 || data.rentHouse.length > 0;
  const hasBuy = data.saleApartment.length > 0 || data.saleHouse.length > 0;
  if (!hasRent && !hasBuy) return null;

  const aptLabel = t("marketTickerApartment");
  const houseLabel = t("marketTickerHouse");
  const rentUnit = currency === "ETB" ? "ETB/m²/mo" : "US$/m²/mo";
  const buyUnit = currency === "ETB" ? "ETB/m²" : "US$/m²";
  const currencyWord = currency === "ETB" ? "ETB" : "US$";

  return (
    <div className="bg-white" aria-label={t("marketTickerLabel")}>
      <Container className="py-3">
        <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: BOARD }}>
          <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white sm:text-base">
                {t("marketTickerTitle")}
              </h2>
              <span className="text-sm font-medium text-white/70" lang="am">
                ሚዛን
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <p className="text-xs text-white/55">
                Average asking price per m² · {currencyWord} · {monthLabel}
              </p>
              <SegmentedControl
                options={[
                  { value: "USD", label: "USD" },
                  { value: "ETB", label: "ETB" }
                ]}
                value={currency}
                onChange={onCurrencyChange}
                size="sm"
                aria-label="Index currency"
                className="border-white/15 bg-white/5 [&_button[aria-selected=false]]:text-white/60 [&_button[aria-selected=true]]:bg-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
            {hasRent ? (
              <>
                <ModeRail label={t("marketTickerRent")} accent={PRIMARY} />
                <div className="min-w-0">
                  {data.rentApartment.length > 0 ? (
                    <LaneRow
                      to="/?listing_mode=for_rent&property_type_group=residential_apartment"
                      label={aptLabel}
                      unit={rentUnit}
                      items={data.rentApartment}
                      mode="rent"
                      typeGroup="residential_apartment"
                      direction="ltr"
                      currency={currency}
                      fx={fx}
                    />
                  ) : null}
                  {data.rentHouse.length > 0 ? (
                    <LaneRow
                      to="/?listing_mode=for_rent&property_type_group=residential_villa"
                      label={houseLabel}
                      unit={rentUnit}
                      items={data.rentHouse}
                      mode="rent"
                      typeGroup="residential_villa"
                      direction="rtl"
                      currency={currency}
                      fx={fx}
                    />
                  ) : null}
                </div>
              </>
            ) : null}

            {hasBuy ? (
              <>
                <ModeRail label={t("searchBuy")} accent="#ffffff" />
                <div className="min-w-0">
                  {data.saleApartment.length > 0 ? (
                    <LaneRow
                      to="/?listing_mode=for_sale&property_type_group=residential_apartment"
                      label={aptLabel}
                      unit={buyUnit}
                      items={data.saleApartment}
                      mode="sale"
                      typeGroup="residential_apartment"
                      direction="ltr"
                      currency={currency}
                      fx={fx}
                    />
                  ) : null}
                  {data.saleHouse.length > 0 ? (
                    <LaneRow
                      to="/?listing_mode=for_sale&property_type_group=residential_villa"
                      label={houseLabel}
                      unit={buyUnit}
                      items={data.saleHouse}
                      mode="sale"
                      typeGroup="residential_villa"
                      direction="rtl"
                      currency={currency}
                      fx={fx}
                    />
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="max-w-3xl text-[11px] leading-relaxed text-white/45">
              Rent {rentUnit} · Buy {buyUnit} · Change: month on month · residential listings on MMizan.com · sub-city
              averages are not like-for-like
              {currency === "ETB" ? ` · FX 1 USD ≈ ${Math.round(fx).toLocaleString("en-US")} ETB` : ""}
            </p>
            <Link
              to="/#listings"
              className="inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
              style={{ backgroundColor: PRIMARY }}
            >
              Browse listings
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
