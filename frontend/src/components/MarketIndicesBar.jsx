import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

function formatPps(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const digits = v >= 100 ? 0 : 2;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

function formatMom(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  const v = Math.abs(Number(pct) * 100);
  const digits = v >= 10 ? 0 : 1;
  return `${v.toFixed(digits)}%`;
}

function MomBadge({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) {
    return <span className="text-[11px] text-white/40">—</span>;
  }
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  if (flat) return <span className="text-[11px] font-semibold text-white/70">0%</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", up ? "text-emerald-300" : "text-rose-300")}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {formatMom(pct)}
    </span>
  );
}

function TickerItems({ items, mode, hidden = false }) {
  return items.map((item) => (
    <Link
      key={`${mode}-${item.district}`}
      tabIndex={hidden ? -1 : undefined}
      to={`/?area=${encodeURIComponent(item.district)}&listing_mode=${mode === "rent" ? "for_rent" : "for_sale"}&property_type_group=residential_apartment`}
      className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-white"
      title={`${item.district}: ${formatPps(item.avgPpsUsd)} per m²`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{item.district}</span>
      <span className="text-sm font-semibold tabular-nums">{formatPps(item.avgPpsUsd)}</span>
      <MomBadge pct={item.momPpsPct} />
    </Link>
  ));
}

function TickerLane({ label, items, mode }) {
  if (!items.length) return null;
  const duration = `${Math.max(items.length, 4) * 7}s`;
  return (
    <div className="flex items-stretch bg-[#0c2340] text-white">
      <div className="flex w-24 shrink-0 items-center justify-center border-r border-white/30 text-xs font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <div
          className="flex w-max animate-ticker-ltr hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: duration }}
        >
          <div className="flex">
            <TickerItems items={items} mode={mode} />
          </div>
          <div className="flex" aria-hidden="true">
            <TickerItems items={items} mode={mode} hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketIndicesBar({ mode = "both" }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/market-ticker")
      .then((response) => {
        if (cancelled) return;
        const body = response.data || {};
        setData({
          rent: Array.isArray(body.rent) ? body.rent : [],
          sale: Array.isArray(body.sale) ? body.sale : []
        });
      })
      .catch(() => {
        if (!cancelled) setData({ rent: [], sale: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || mode === "hidden") return null;
  const showRent = mode !== "sale" && data.rent.length > 0;
  const showSale = mode !== "rent" && data.sale.length > 0;
  if (!showRent && !showSale) return null;

  return (
    <div className="border-y border-[#0c2340]" aria-label={t("marketTickerLabel")}>
      {showSale ? <TickerLane label={t("searchBuy")} items={data.sale} mode="sale" /> : null}
      {showRent ? <TickerLane label={t("searchRent")} items={data.rent} mode="rent" /> : null}
    </div>
  );
}
