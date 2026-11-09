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

function TickerPill({ item, mode }) {
  return (
    <Link
      to={`/?area=${encodeURIComponent(item.district)}&listing_mode=${mode === "sale" ? "for_sale" : "for_rent"}&property_type_group=residential_apartment`}
      className="flex shrink-0 items-center gap-2 rounded-md bg-[#111] px-3 py-1.5 text-white"
      title={`${item.district}: ${formatPps(item.avgPpsUsd)} per m²`}
    >
      <span className="text-xs font-semibold text-white">{item.district}</span>
      <span className="text-xs tabular-nums text-white/90">{formatPps(item.avgPpsUsd)}</span>
      <MomBadge pct={item.momPpsPct} />
    </Link>
  );
}

/** Enough copies that the belt always overflows and the -50% loop stays seamless. */
function beltItems(items) {
  if (!items.length) return [];
  const out = [];
  while (out.length < 12) out.push(...items);
  return out;
}

function TickerLane({ label, items, mode }) {
  if (!items.length) return null;
  const belt = beltItems(items);
  // Two identical halves → translateX(-50%) loops without a jump.
  const loop = [...belt, ...belt];
  const durationSec = Math.max(belt.length * 2.8, 28);
  const listingMode = mode === "sale" ? "for_sale" : "for_rent";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link
        to={`/?listing_mode=${listingMode}`}
        className="flex h-9 w-[7.5rem] shrink-0 items-center justify-between rounded-xl bg-primary px-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-dark"
      >
        <span>{label}</span>
        <IconArrowRight size={16} />
      </Link>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="flex w-max gap-2 will-change-transform"
          style={{ animation: `ticker-ltr ${durationSec}s linear infinite` }}
        >
          {loop.map((item, index) => (
            <TickerPill key={`${mode}-${index}`} item={item} mode={mode} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Public Buy + Rent market pills — always visible, always scrolling. */
export default function MarketIndicesBar() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "mm-market-ticker";
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.rent?.length || parsed.sale?.length)) setData(parsed);
      }
    } catch {
      /* ignore */
    }
    api
      .get("/market-ticker", { timeout: 20000 })
      .then((response) => {
        if (cancelled) return;
        const body = response.data || {};
        const next = {
          rent: Array.isArray(body.rent) ? body.rent : [],
          sale: Array.isArray(body.sale) ? body.sale : []
        };
        if (!next.rent.length && !next.sale.length) return;
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
  const showSale = data.sale.length > 0;
  const showRent = data.rent.length > 0;
  if (!showSale && !showRent) return null;

  return (
    <div className="bg-white" aria-label={t("marketTickerLabel")}>
      <Container className="space-y-2 py-3">
        {showRent ? <TickerLane label={t("marketTickerRent")} items={data.rent} mode="rent" /> : null}
        {showSale ? <TickerLane label={t("searchBuy")} items={data.sale} mode="sale" /> : null}
      </Container>
    </div>
  );
}
