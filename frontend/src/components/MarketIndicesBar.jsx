import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";

const NAVY = "#0f172a";
const BLUE = "#2563eb";

function formatPps(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const digits = v >= 100 ? 0 : 2;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

function formatMom(pct) {
  const v = Math.abs(Number(pct) * 100);
  const digits = v >= 10 ? 0 : 1;
  return `${v.toFixed(digits)}%`;
}

function MomBadge({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  if (Math.abs(Number(pct)) < 0.0005) return null;
  const up = Number(pct) > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${up ? "text-emerald-300" : "text-rose-300"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {formatMom(pct)}
    </span>
  );
}

function TickerPill({ item, mode, typeGroup }) {
  return (
    <Link
      to={`/?area=${encodeURIComponent(item.district)}&listing_mode=${mode === "sale" ? "for_sale" : "for_rent"}&property_type_group=${typeGroup}`}
      className="flex shrink-0 items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-white transition-colors hover:bg-white/20"
      title={`${item.district}: ${formatPps(item.avgPpsUsd)} per m²`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="text-xs font-semibold text-white">{item.district}</span>
      <span className="text-xs tabular-nums text-white/90">{formatPps(item.avgPpsUsd)}</span>
      <MomBadge pct={item.momPpsPct} />
    </Link>
  );
}

/** Enough copies that the belt always overflows and the ±50% loop stays seamless. */
function beltItems(items) {
  if (!items.length) return [];
  const out = [];
  while (out.length < 12) out.push(...items);
  return out;
}

/**
 * direction: "ltr" = content drifts right, "rtl" = content drifts left.
 * apartment L→R, house R→L.
 */
function TickerLane({ items, mode, typeGroup, direction }) {
  if (!items.length) {
    return <div className="min-w-0 flex-1" />;
  }
  const belt = beltItems(items);
  const loop = [...belt, ...belt];
  const durationSec = Math.max(belt.length * 2.8, 28);
  const anim = direction === "ltr" ? "ticker-rtl" : "ticker-ltr";

  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div
        className="flex w-max gap-2 will-change-transform"
        style={{ animation: `${anim} ${durationSec}s linear infinite` }}
      >
        {loop.map((item, index) => (
          <TickerPill key={`${mode}-${typeGroup}-${index}`} item={item} mode={mode} typeGroup={typeGroup} />
        ))}
      </div>
    </div>
  );
}

function LaneRow({ to, label, items, mode, typeGroup, direction, tone }) {
  const bg = tone === "blue" ? BLUE : NAVY;
  return (
    <div
      className="flex min-h-[3.1rem] min-w-0 items-center gap-3 px-3 sm:min-h-[3.35rem] sm:px-4"
      style={{ backgroundColor: bg }}
    >
      <Link
        to={to}
        className="w-[6.5rem] shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80 sm:w-28 sm:text-xs"
      >
        {label}
      </Link>
      <TickerLane items={items} mode={mode} typeGroup={typeGroup} direction={direction} />
    </div>
  );
}

function ModeCell({ to, label, rows = 2 }) {
  return (
    <Link
      to={to}
      className={`flex min-h-[2.75rem] items-center justify-center px-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 sm:min-h-0 sm:text-sm ${rows >= 2 ? "sm:row-span-2" : "sm:row-span-1"}`}
      style={{ backgroundColor: NAVY }}
    >
      {label}
    </Link>
  );
}

/** Mizan Index board: title | Rent/Buy | four apartment/house ticker lanes. */
export default function MarketIndicesBar() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "mm-market-ticker-v2";
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
          saleHouse: Array.isArray(body.saleHouse) ? body.saleHouse : []
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
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* keep cached / previous data so the bar does not vanish */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const hasRent = data.rentApartment.length > 0 || data.rentHouse.length > 0;
  const hasBuy = data.saleApartment.length > 0 || data.saleHouse.length > 0;
  if (!hasRent && !hasBuy) return null;

  const aptLabel = t("marketTickerApartment");
  const houseLabel = t("marketTickerHouse");
  const rentRows = (data.rentApartment.length > 0 ? 1 : 0) + (data.rentHouse.length > 0 ? 1 : 0) || 2;
  const buyRows = (data.saleApartment.length > 0 ? 1 : 0) + (data.saleHouse.length > 0 ? 1 : 0) || 2;

  return (
    <div className="bg-white" aria-label={t("marketTickerLabel")}>
      <Container className="py-3">
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <div className="flex min-h-[3rem] shrink-0 items-center justify-center bg-black px-4 py-4 text-center sm:w-[8.5rem] lg:w-40">
            <h2 className="text-[11px] font-bold uppercase leading-snug tracking-[0.18em] text-white sm:text-xs lg:text-sm">
              {t("marketTickerTitle")}
            </h2>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-[5.5rem_minmax(0,1fr)] lg:grid-cols-[6.5rem_minmax(0,1fr)]">
            {hasRent ? (
              <>
                <ModeCell to="/?listing_mode=for_rent" label={t("marketTickerRent")} rows={rentRows} />
                {data.rentApartment.length > 0 ? (
                  <LaneRow
                    to="/?listing_mode=for_rent&property_type_group=residential_apartment"
                    label={aptLabel}
                    items={data.rentApartment}
                    mode="rent"
                    typeGroup="residential_apartment"
                    direction="ltr"
                    tone="navy"
                  />
                ) : null}
                {data.rentHouse.length > 0 ? (
                  <LaneRow
                    to="/?listing_mode=for_rent&property_type_group=residential_villa"
                    label={houseLabel}
                    items={data.rentHouse}
                    mode="rent"
                    typeGroup="residential_villa"
                    direction="rtl"
                    tone="blue"
                  />
                ) : null}
              </>
            ) : null}

            {hasBuy ? (
              <>
                <ModeCell to="/?listing_mode=for_sale" label={t("searchBuy")} rows={buyRows} />
                {data.saleApartment.length > 0 ? (
                  <LaneRow
                    to="/?listing_mode=for_sale&property_type_group=residential_apartment"
                    label={aptLabel}
                    items={data.saleApartment}
                    mode="sale"
                    typeGroup="residential_apartment"
                    direction="ltr"
                    tone="navy"
                  />
                ) : null}
                {data.saleHouse.length > 0 ? (
                  <LaneRow
                    to="/?listing_mode=for_sale&property_type_group=residential_villa"
                    label={houseLabel}
                    items={data.saleHouse}
                    mode="sale"
                    typeGroup="residential_villa"
                    direction="rtl"
                    tone="blue"
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}
