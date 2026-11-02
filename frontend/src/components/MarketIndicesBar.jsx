import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";
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
    return <span className="text-[11px] text-white/45">—</span>;
  }
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  if (flat) return <span className="text-[11px] font-semibold text-white/70">0%</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        up ? "text-emerald-400" : "text-rose-400"
      )}
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
      className="flex shrink-0 items-center gap-2 rounded-md bg-[#111] px-3 py-1.5 text-white shadow-sm"
      title={`${item.district}: ${formatPps(item.avgPpsUsd)} per m²`}
    >
      <span className="text-xs font-semibold text-white">{item.district}</span>
      <span className="text-xs tabular-nums text-white/90">{formatPps(item.avgPpsUsd)}</span>
      <MomBadge pct={item.momPpsPct} />
    </Link>
  );
}

function TickerLane({ label, items, mode }) {
  if (!items.length) return null;
  const duration = `${Math.max(items.length, 4) * 8}s`;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-deep">{label}</div>
      <div className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <div
          className="flex w-max gap-2 animate-ticker-ltr hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: duration }}
        >
          <div className="flex gap-2">
            {items.map((item) => (
              <TickerPill key={`${mode}-${item.district}`} item={item} mode={mode} />
            ))}
          </div>
          <div className="flex gap-2" aria-hidden="true">
            {items.map((item) => (
              <TickerPill key={`${mode}-dup-${item.district}`} item={item} mode={mode} />
            ))}
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
    if (mode === "hidden") return undefined;
    let cancelled = false;
    api
      .get("/market-ticker")
      .then((response) => {
        if (cancelled) return;
        const body = response.data || {};
        setData({
          rent: Array.isArray(body.rent) ? body.rent : [],
          rentFurnished: Array.isArray(body.rentFurnished) ? body.rentFurnished : [],
          sale: Array.isArray(body.sale) ? body.sale : []
        });
      })
      .catch(() => {
        if (!cancelled) setData({ rent: [], rentFurnished: [], sale: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (!data || mode === "hidden") return null;
  const showRent = mode !== "sale" && data.rent.length > 0;
  const showRentFurnished = mode !== "sale" && data.rentFurnished.length > 0;
  const showSale = mode !== "rent" && data.sale.length > 0;
  if (!showRent && !showRentFurnished && !showSale) return null;

  return (
    <div className="border-y border-line bg-white" aria-label={t("marketTickerLabel")}>
      <Container className="space-y-2 py-3">
        {showSale ? <TickerLane label={t("searchBuy")} items={data.sale} mode="sale" /> : null}
        {showRent ? <TickerLane label={t("marketTickerRent")} items={data.rent} mode="rent" /> : null}
        {showRentFurnished ? (
          <TickerLane label={t("marketTickerRentFurnished")} items={data.rentFurnished} mode="rent" />
        ) : null}
      </Container>
    </div>
  );
}
