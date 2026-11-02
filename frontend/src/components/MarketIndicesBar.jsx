import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";

function formatPps(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const digits = v >= 100 ? 0 : 2;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
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

/** Always show Buy + Rent market pills — never hide on filter/auth changes. */
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
        {showSale ? <TickerLane label={t("searchBuy")} items={data.sale} mode="sale" /> : null}
        {showRent ? <TickerLane label={t("marketTickerRent")} items={data.rent} mode="rent" /> : null}
      </Container>
    </div>
  );
}
