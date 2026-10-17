import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { DashboardWidget, dashStat, dashStatValue, dashStatLabel, dashMuted } from "./DashboardWidget";
import { Button, SegmentedControl } from "../ui";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";

const hmloColors = {
  opportunity: "border-primary/30 bg-primary/5",
  low: "border-destructive/30 bg-destructive/5",
  medium: "border-warning/30 bg-warning/5",
  high: "border-success/30 bg-success/5"
};

const DATASET_OPTIONS = [
  { value: "apartment|rent", label: "Apt · Rent" },
  { value: "apartment|sale", label: "Apt · Sale" },
  { value: "house|rent", label: "House · Rent" },
  { value: "house|sale", label: "House · Sale" }
];

const METRIC_OPTIONS = [
  { value: "pps", label: "USD/m²" },
  { value: "volume", label: "Listings" }
];

function formatUsd(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

function formatPps(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1000) return `$${Math.round(v).toLocaleString("en-US")}`;
  return `$${v.toFixed(2)}`;
}

function MomCell({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) return <span className="text-muted">—</span>;
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  const label = `${(Math.abs(Number(pct)) * 100).toFixed(1)}%`;
  if (flat) return <span className="text-muted">0%</span>;
  return (
    <span className={cn("font-semibold tabular-nums", up ? "text-success" : "text-destructive")}>
      {up ? "▲" : "▼"} {label}
    </span>
  );
}

/** Compact city-wide bars for the selected metric across calendar months. */
function MonthBars({ series, metric }) {
  if (!series?.length) return null;
  const values = series.map((s) => (metric === "pps" ? s.avg_pps_usd : s.listing_count) ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Monthly trend">
      {series.map((s, i) => {
        const v = values[i];
        const h = Math.max(4, (v / max) * 120);
        const prev = i > 0 ? values[i - 1] : null;
        const up = prev != null && v > prev;
        const down = prev != null && v < prev;
        return (
          <div key={s.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${s.label}: ${metric === "pps" ? formatPps(s.avg_pps_usd) : v}`}>
            <span className="text-[11px] font-semibold tabular-nums text-brand-deep">
              {metric === "pps" ? formatPps(s.avg_pps_usd) : v}
            </span>
            <div
              className={cn("w-full max-w-[48px] rounded-t", up ? "bg-success/80" : down ? "bg-destructive/70" : "bg-primary/80")}
              style={{ height: `${h}px` }}
            />
            <span className="truncate text-[10px] text-muted">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Tiny sparkline of a district's monthly USD/m² or volume. */
function Sparkline({ points, metric }) {
  if (!points?.length) return null;
  const vals = points.map((p) => (metric === "pps" ? p.avg_pps_usd : p.listing_count) ?? 0);
  const max = Math.max(...vals, 1);
  const w = 64;
  const h = 22;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = vals
    .map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="inline-block overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketIntelligenceWidget({ market }) {
  const { token } = useAuth();
  const [dataset, setDataset] = useState("apartment|rent");
  const [metric, setMetric] = useState("pps");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const dist = market?.hmloDistribution || {};
  const bySubcity = market?.bySubcity || [];
  const marketIndex = market?.marketIndex;
  const [propertyClass, listingMode] = dataset.split("|");

  const monthlyDs = marketIndex?.monthly?.datasets?.[dataset] || null;
  const months = monthlyDs?.months || [];
  const hasPrev = Boolean(monthlyDs?.previousMonth);
  const compareMode = monthlyDs?.compareMode || marketIndex?.monthly?.compareMode || "calendar";

  const indexRows = useMemo(() => {
    if (monthlyDs?.districts?.length) return monthlyDs.districts;
    const rows = (marketIndex?.indexes || []).filter(
      (r) => r.property_class === propertyClass && r.listing_mode === listingMode
    );
    return [...rows].sort((a, b) => b.listing_count - a.listing_count || a.district.localeCompare(b.district));
  }, [monthlyDs, marketIndex, propertyClass, listingMode]);

  const summary = monthlyDs?.summary || {
    listing_count: indexRows.reduce((s, r) => s + (r.listing_count || 0), 0),
    avg_pps_usd: null,
    mom_pps_pct: null,
    mom_count_pct: null
  };

  async function downloadExport() {
    setExporting(true);
    setExportError("");
    try {
      const r = await api.get("/admin/export/properties.csv", {
        responseType: "blob",
        timeout: 120000,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const blob = new Blob([r.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `market-mizan-properties-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.response?.data?.message || e.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const hmloLabels = {
    opportunity: "Opportunity",
    low: "Low",
    medium: "Medium",
    high: "High"
  };

  const curLabel = monthlyDs?.currentLabel || "This month";
  const prevLabel = monthlyDs?.previousLabel || "Prev. month";

  return (
    <DashboardWidget
      title="Market intelligence"
      subtitle={`Monthly district indexes in USD · FX 1 USD = ${market?.fxRateEtbPerUsd ?? "—"} ETB · ${market?.opportunities ?? 0} opportunities`}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl options={DATASET_OPTIONS} value={dataset} onChange={setDataset} size="sm" aria-label="Index dataset" />
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <Button variant="secondary" onClick={downloadExport} disabled={exporting}>
            {exporting ? "Preparing Excel…" : "Export all properties (Excel)"}
          </Button>
          <p className="text-[11px] text-muted">CSV opens in Excel · cleaned classes, USD/m², canonical sub-city</p>
          {exportError ? <p className="text-xs text-destructive">{exportError}</p> : null}
        </div>
      </div>

      {/* Monthly analysis */}
      <div className="mb-8 rounded-xl border border-line bg-bg/40 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-heading">Monthly analysis</h3>
            <p className={cn(dashMuted, "mt-0.5")}>
              {compareMode === "month_start"
                ? `${curLabel} vs month start · until a full prior calendar month exists, we compare against the first snapshot of this month`
                : hasPrev
                  ? `${curLabel} vs ${prevLabel} · calendar-month comparison of average USD/m² and listing volume`
                  : `${curLabel} (month to date) · previous calendar month appears after the next month starts`}
            </p>
          </div>
          <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={setMetric} size="sm" aria-label="Chart metric" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={dashStat}>
            <span className={dashStatValue}>{summary.listing_count ?? 0}</span>
            <span className={dashStatLabel}>Listings · {curLabel}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>
              <MomCell pct={summary.mom_count_pct} />
            </span>
            <span className={dashStatLabel}>Volume vs {hasPrev ? prevLabel : "prev. month"}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>{formatPps(summary.avg_pps_usd)}</span>
            <span className={dashStatLabel}>Avg USD/m² · {curLabel}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>
              <MomCell pct={summary.mom_pps_pct} />
            </span>
            <span className={dashStatLabel}>Price vs {hasPrev ? prevLabel : "prev. month"}</span>
          </div>
        </div>

        {monthlyDs?.citywide?.length ? (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              City-wide {metric === "pps" ? "USD/m²" : "listings"} by month
            </p>
            <MonthBars series={monthlyDs.citywide} metric={metric} />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-muted/40 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Sub-city</th>
                <th className="px-3 py-2 font-medium text-right">{curLabel} USD/m²</th>
                <th className="px-3 py-2 font-medium text-right">{prevLabel} USD/m²</th>
                <th className="px-3 py-2 font-medium text-right">Price Δ</th>
                <th className="px-3 py-2 font-medium text-right">{curLabel} listings</th>
                <th className="px-3 py-2 font-medium text-right">{prevLabel} listings</th>
                <th className="px-3 py-2 font-medium text-right">Volume Δ</th>
                {months.length > 1 ? <th className="px-3 py-2 font-medium text-right">Trend</th> : null}
              </tr>
            </thead>
            <tbody>
              {indexRows.map((row) => (
                <tr key={row.district} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link
                      to={`/?area=${encodeURIComponent(row.district)}&listing_mode=${listingMode === "rent" ? "for_rent" : "for_sale"}&property_type_group=${
                        propertyClass === "apartment" ? "residential_apartment" : "residential_villa"
                      }`}
                      className="font-medium text-brand-deep hover:text-primary hover:underline"
                    >
                      {row.district}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{formatPps(row.avg_pps_usd)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{formatPps(row.prev_avg_pps_usd)}</td>
                  <td className="px-3 py-2 text-right">
                    <MomCell pct={row.mom_pps_pct} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.listing_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{row.prev_listing_count ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <MomCell pct={row.mom_count_pct} />
                  </td>
                  {months.length > 1 ? (
                    <td className="px-3 py-2 text-right">
                      <Sparkline points={row.series || []} metric={metric} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {compareMode === "month_start" ? (
          <p className={cn(dashMuted, "mt-2")}>
            From next calendar month this switches automatically to true month-vs-month (e.g. Nov vs Oct).
          </p>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(hmloLabels).map(([key, label]) => (
          <div key={key} className={cn(dashStat, hmloColors[key])}>
            <span className={dashStatValue}>{dist[key] ?? 0}</span>
            <span className={dashStatLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div className="mb-2">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">All listings by sub-city (live inventory)</h3>
        {bySubcity.length === 0 ? (
          <p className={dashMuted}>No sub-city data yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-muted/40 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Sub-city</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium text-right">Rent</th>
                  <th className="px-3 py-2 font-medium text-right">Sale</th>
                  <th className="px-3 py-2 font-medium text-right">Avg USD</th>
                  <th className="px-3 py-2 font-medium text-right">$/m²</th>
                </tr>
              </thead>
              <tbody>
                {bySubcity.map((row) => (
                  <tr key={row.area} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link to={`/?area=${encodeURIComponent(row.area)}`} className="font-medium text-brand-deep hover:text-primary hover:underline">
                        {row.area}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{row.rent}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{row.sale}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatUsd(row.avg_price_usd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.median_pps_usd != null ? `$${row.median_pps_usd}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
