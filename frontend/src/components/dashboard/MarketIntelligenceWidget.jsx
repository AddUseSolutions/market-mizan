import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { DashboardWidget, dashStat, dashStatValue, dashStatLabel, dashMuted } from "./DashboardWidget";
import { Button, SegmentedControl } from "../ui";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";

const DATASET_OPTIONS = [
  { value: "apartment|rent", label: "Apt · Rent" },
  { value: "house|rent", label: "House · Rent" },
  { value: "apartment|sale", label: "Apt · Sale" },
  { value: "house|sale", label: "House · Sale" }
];

const HEADER_HELP = {
  district: "Addis Ababa sub-city (canonical area).",
  pps: "Average price per m² for listings included in the index (outliers excluded).",
  prevPps: "Average price per m² in the previous calendar month.",
  priceDelta: "Month-over-month change in average USD/m² (price trend).",
  listings: "Number of active listings in this sub-city for the selected dataset.",
  prevListings: "Listing count in the previous calendar month.",
  volumeDelta: "Month-over-month change in listing count (volume).",
  trend: "Price-only sparkline across the analysis months (Apr → …)."
};

function formatFullNumber(n, { digits = 0 } = {}) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatMoney(n, currency, fx) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const usd = Number(n);
  if (currency === "ETB") {
    const etb = usd * (Number(fx) || 0);
    return etb ? `ETB ${formatFullNumber(etb, { digits: 0 })}` : "—";
  }
  const digits = usd >= 100 ? 0 : 2;
  return `$${formatFullNumber(usd, { digits })}`;
}

function MomCell({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) return <span className="text-muted">—</span>;
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  const label = `${(Math.abs(Number(pct)) * 100).toFixed(1)}%`;
  if (flat) return <span className="text-muted">→ 0%</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", up ? "text-success" : "text-destructive")}>
      <span aria-hidden className="text-base leading-none">
        {up ? "▲" : "▼"}
      </span>
      {label}
    </span>
  );
}

function Th({ children, help, className = "" }) {
  return (
    <th className={cn("px-3 py-2 font-medium", className)} title={help}>
      <span className="cursor-help border-b border-dotted border-muted/50">{children}</span>
    </th>
  );
}

function MonthBars({ series, currency, fx }) {
  if (!series?.length) return null;
  const values = series.map((s) => s.avg_pps_usd ?? 0);
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Monthly price index">
      {series.map((s, i) => {
        const v = values[i];
        const h = Math.max(4, (v / max) * 120);
        const prev = i > 0 ? values[i - 1] : null;
        const up = prev != null && v > prev;
        const down = prev != null && v < prev;
        return (
          <div
            key={s.month}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${s.label}: ${formatMoney(s.avg_pps_usd, currency, fx)} · Δ ${s.mom_pps_pct != null ? `${(s.mom_pps_pct * 100).toFixed(1)}%` : "—"}`}
          >
            <span className="text-[11px] font-semibold tabular-nums text-brand-deep">
              {formatMoney(s.avg_pps_usd, currency, fx)}
            </span>
            <div
              className={cn("w-full max-w-[48px] rounded-t", up ? "bg-success/80" : down ? "bg-destructive/70" : "bg-primary/80")}
              style={{ height: `${h}px` }}
            />
            <span className="truncate text-[10px] text-muted">{s.label}</span>
            {s.mom_pps_pct != null ? (
              <span className={cn("text-[10px] font-semibold", s.mom_pps_pct > 0 ? "text-success" : s.mom_pps_pct < 0 ? "text-destructive" : "text-muted")}>
                {s.mom_pps_pct > 0 ? "▲" : s.mom_pps_pct < 0 ? "▼" : "→"}
              </span>
            ) : (
              <span className="text-[10px] text-muted"> </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Price-only sparkline. */
function Sparkline({ points }) {
  if (!points?.length) return null;
  const vals = points.map((p) => p.avg_pps_usd ?? 0);
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

export default function MarketIntelligenceWidget({ market: marketProp = null, standalone = false }) {
  const { token, user } = useAuth();
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(!marketProp?.marketIndex);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState("apartment|rent");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [rebuilding, setRebuilding] = useState(false);

  const marketIndex = report?.monthly ? report : marketProp?.marketIndex;
  const fx = report?.fxRateEtbPerUsd ?? marketProp?.fxRateEtbPerUsd ?? 130;

  useEffect(() => {
    if (!standalone && marketProp?.marketIndex && !selectedMonth) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get("/admin/market-indices", {
        params: { full: 1, ...(selectedMonth ? { month: selectedMonth } : {}) },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      .then((r) => {
        if (!cancelled) setReport(r.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || "Could not load market intelligence.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [standalone, selectedMonth, token, marketProp?.marketIndex]);

  const [propertyClass, listingMode] = dataset.split("|");
  const monthlyDs = marketIndex?.monthly?.datasets?.[dataset] || marketIndex?.datasets?.[dataset] || null;
  const months = monthlyDs?.months || marketIndex?.months || [];
  const availableMonths = monthlyDs?.availableMonths || marketIndex?.availableMonths || months;
  const hasPrev = Boolean(monthlyDs?.previousMonth);
  const compareMode = monthlyDs?.compareMode || marketIndex?.compareMode || "calendar";

  const indexRows = useMemo(() => {
    if (monthlyDs?.districts?.length) return monthlyDs.districts;
    return [];
  }, [monthlyDs]);

  const summary = monthlyDs?.summary || {
    listing_count: 0,
    avg_pps_usd: null,
    mom_pps_pct: null,
    mom_count_pct: null
  };

  const unitHint =
    propertyClass === "house" && listingMode === "sale" ? "USD/m² land" : "USD/m² living";

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

  async function rebuildHistory() {
    if (!isAdmin) return;
    setRebuilding(true);
    setError("");
    try {
      await api.post(
        "/admin/market-index/rebuild",
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined, timeout: 180000 }
      );
      const r = await api.get("/admin/market-indices", {
        params: { full: 1, ...(selectedMonth ? { month: selectedMonth } : {}) },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      setReport(r.data);
    } catch (e) {
      setError(e.response?.data?.message || "Rebuild failed.");
    } finally {
      setRebuilding(false);
    }
  }

  const curLabel = monthlyDs?.currentLabel || "This month";
  const prevLabel = monthlyDs?.previousLabel || "Prev. month";
  const windowLabel = marketIndex?.analysisWindow
    ? `${marketIndex.analysisWindow.start} → ${marketIndex.analysisWindow.end}`
    : "2026-04 → 2026-09";

  return (
    <DashboardWidget
      title="Market intelligence"
      subtitle={`Monthly price index · top 5 sub-cities by listings · ${unitHint} · FX 1 USD = ${formatFullNumber(fx)} ETB · window ${windowLabel}`}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl options={DATASET_OPTIONS} value={dataset} onChange={setDataset} size="sm" aria-label="Index dataset" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Month
            <select
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-heading"
              value={selectedMonth || monthlyDs?.currentMonth || ""}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select analysis month"
            >
              {(availableMonths.length ? availableMonths : months).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <SegmentedControl
            options={[
              { value: "USD", label: "USD" },
              { value: "ETB", label: "ETB" }
            ]}
            value={currency}
            onChange={setCurrency}
            size="sm"
            aria-label="Currency"
          />
          <Button variant="secondary" onClick={downloadExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Export Excel"}
          </Button>
          {isAdmin ? (
            <Button variant="secondary" onClick={rebuildHistory} disabled={rebuilding}>
              {rebuilding ? "Rebuilding…" : "Rebuild Apr–Sep"}
            </Button>
          ) : null}
        </div>
      </div>
      {exportError ? <p className="mb-2 text-xs text-destructive">{exportError}</p> : null}
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      {loading && !monthlyDs ? <p className="text-muted">Loading market intelligence…</p> : null}

      <div className="mb-8 rounded-xl border border-line bg-bg/40 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-heading">Monthly price index</h3>
          <p className={cn(dashMuted, "mt-0.5")}>
            {compareMode === "month_start"
              ? `${curLabel} vs month start · arrows show whether prices rose, fell, or stayed flat`
              : hasPrev
                ? `${curLabel} vs ${prevLabel} · price & listing deltas always in percent`
                : `${curLabel} · previous month appears after month-close (1st · 00:01 Addis)`}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={dashStat}>
            <span className={dashStatValue}>{formatFullNumber(summary.listing_count ?? 0)}</span>
            <span className={dashStatLabel}>Listings · {curLabel}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>
              <MomCell pct={summary.mom_count_pct} />
            </span>
            <span className={dashStatLabel}>Volume Δ vs {hasPrev ? prevLabel : "prev."}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>{formatMoney(summary.avg_pps_usd, currency, fx)}</span>
            <span className={dashStatLabel}>Avg / m² · {curLabel}</span>
          </div>
          <div className={dashStat}>
            <span className={dashStatValue}>
              <MomCell pct={summary.mom_pps_pct} />
            </span>
            <span className={dashStatLabel}>Price Δ vs {hasPrev ? prevLabel : "prev."}</span>
          </div>
        </div>

        {monthlyDs?.citywide?.length ? (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">City-wide price / m² by month</p>
            <MonthBars series={monthlyDs.citywide.filter((s) => months.includes(s.month))} currency={currency} fx={fx} />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-muted/40 text-xs uppercase tracking-wider text-muted">
              <tr>
                <Th help={HEADER_HELP.district}>Sub-city</Th>
                <Th help={HEADER_HELP.pps} className="text-right">
                  {curLabel} / m²
                </Th>
                <Th help={HEADER_HELP.prevPps} className="text-right">
                  {prevLabel} / m²
                </Th>
                <Th help={HEADER_HELP.priceDelta} className="text-right">
                  Price Δ
                </Th>
                <Th help={HEADER_HELP.listings} className="text-right">
                  {curLabel} listings
                </Th>
                <Th help={HEADER_HELP.prevListings} className="text-right">
                  {prevLabel} listings
                </Th>
                <Th help={HEADER_HELP.volumeDelta} className="text-right">
                  Volume Δ
                </Th>
                {months.length > 1 ? (
                  <Th help={HEADER_HELP.trend} className="text-right">
                    Price trend
                  </Th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {indexRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted">
                    No indexed districts yet for this dataset. Admin: run Rebuild Apr–Sep.
                  </td>
                </tr>
              ) : (
                indexRows.map((row) => (
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
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(row.avg_pps_usd, currency, fx)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">{formatMoney(row.prev_avg_pps_usd, currency, fx)}</td>
                    <td className="px-3 py-2 text-right">
                      <MomCell pct={row.mom_pps_pct} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatFullNumber(row.listing_count)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {row.prev_listing_count != null ? formatFullNumber(row.prev_listing_count) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MomCell pct={row.mom_count_pct} />
                    </td>
                    {months.length > 1 ? (
                      <td className="px-3 py-2 text-right">
                        <Sparkline points={row.series || []} />
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={cn(dashMuted, "mt-2")}>
          Rent listings with USD/m² above 50 are excluded. House sale uses land m²; apt sale / all rent use living m². Showing top{" "}
          {marketIndex?.topDistricts || 5} sub-cities by listing count.
        </p>
      </div>
    </DashboardWidget>
  );
}
