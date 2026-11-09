import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";
import { IconArrowRight } from "./icons/HeroIcons";

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
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}
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
      className="flex shrink-0 items-center gap-2 rounded-md bg-[#111] px-3 py-1.5 text-white"
      title={`${item.district}: ${formatPps(item.avgPpsUsd)} per m²`}
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

function ModeLink({ to, label }) {
  return (
    <Link
      to={to}
      className="flex h-9 w-[7.5rem] shrink-0 items-center justify-between rounded-xl bg-primary px-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-dark"
    >
      <span>{label}</span>
      <IconArrowRight size={16} />
    </Link>
  );
}

function ClassLink({ to, label }) {
  return (
    <Link
      to={to}
      className="flex h-8 w-[6.75rem] shrink-0 items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/15"
    >
      <span>{label}</span>
      <IconArrowRight size={14} />
    </Link>
  );
}

/**
 * direction: "ltr" = left → right visually (content moves rightward via reverse translate),
 *            "rtl" = right → left (classic sushi belt).
 * CSS: ticker-ltr moves 0 → -50% (items travel left = appear to come from the right).
 *      ticker-rtl moves -50% → 0 (items travel right = appear to come from the left).
 * User ask: apartment L→R, house R→L.
 *   L→R belt = ticker-rtl animation (content drifts right)
 *   R→L belt = ticker-ltr animation (content drifts left)
 */
function TickerLane({ items, mode, typeGroup, direction }) {
  if (!items.length) return null;
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

function ModeBlock({ modeLabel, modeTo, apartmentItems, houseItems, mode, apartmentLabel, houseLabel }) {
  const aptTo = `${modeTo}&property_type_group=residential_apartment`;
  const houseTo = `${modeTo}&property_type_group=residential_villa`;
  const hasApt = apartmentItems.length > 0;
  const hasHouse = houseItems.length > 0;
  if (!hasApt && !hasHouse) return null;

  return (
    <div className="space-y-2">
      <ModeLink to={modeTo} label={modeLabel} />
      {hasApt ? (
        <div className="flex min-w-0 items-center gap-3 pl-0 sm:pl-1">
          <ClassLink to={aptTo} label={apartmentLabel} />
          <TickerLane items={apartmentItems} mode={mode} typeGroup="residential_apartment" direction="ltr" />
        </div>
      ) : null}
      {hasHouse ? (
        <div className="flex min-w-0 items-center gap-3 pl-0 sm:pl-1">
          <ClassLink to={houseTo} label={houseLabel} />
          <TickerLane items={houseItems} mode={mode} typeGroup="residential_villa" direction="rtl" />
        </div>
      ) : null}
    </div>
  );
}

/** Four moving Mizan Index belts: Rent apt/house, then Buy apt/house. */
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

  return (
    <div className="bg-white" aria-label={t("marketTickerLabel")}>
      <Container className="space-y-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-brand-deep">{t("marketTickerTitle")}</h2>
          <p className="text-xs text-muted">{t("marketTickerLabel")}</p>
        </div>
        {hasRent ? (
          <ModeBlock
            modeLabel={t("marketTickerRent")}
            modeTo="/?listing_mode=for_rent"
            apartmentItems={data.rentApartment}
            houseItems={data.rentHouse}
            mode="rent"
            apartmentLabel={t("marketTickerApartment")}
            houseLabel={t("marketTickerHouse")}
          />
        ) : null}
        {hasBuy ? (
          <ModeBlock
            modeLabel={t("searchBuy")}
            modeTo="/?listing_mode=for_sale"
            apartmentItems={data.saleApartment}
            houseItems={data.saleHouse}
            mode="sale"
            apartmentLabel={t("marketTickerApartment")}
            houseLabel={t("marketTickerHouse")}
          />
        ) : null}
      </Container>
    </div>
  );
}
