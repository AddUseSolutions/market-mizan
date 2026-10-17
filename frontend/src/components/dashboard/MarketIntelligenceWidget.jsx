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

function MomCell({ pct, suffix = "" }) {
  if (pct == null || !Number.isFinite(Number(pct))) return <span className="text-muted">—</span>;
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  const label = `${(Math.abs(Number(pct)) * 100).toFixed(1)}%${suffix}`;
  if (flat) return <span className="text-muted">0%</span>;
  return (
    <span className={cn("font-semibold tabular-nums", up ? "text-success" : "text-destructive")}>
      {up ? "▲" : "▼"} {label}
    </span>
  );
}

export default function MarketIntelligenceWidget({ market }) {
  const { token } = useAuth();
  const [dataset, setDataset] = useState("apartment|rent");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const dist = market?.hmloDistribution || {};
  const bySubcity = market?.bySubcity || [];
  const priceHistory = market?.priceHistory || {};
  const marketIndex = market?.marketIndex;

  const [propertyClass, listingMode] = dataset.split("|");
  const indexRows = useMemo(() => {
    const rows = (marketIndex?.indexes || []).filter(
      (r) => r.property_class === propertyClass && r.listing_mode === listingMode
    );
    return [...rows].sort((a, b) => b.listing_count - a.listing_count || a.district.localeCompare(b.district));
  }, [marketIndex, propertyClass, listingMode]);

  const totals = useMemo(() => {
    const listings = indexRows.reduce((s, r) => s + (r.listing_count || 0), 0);
    const withPps = indexRows.filter((r) => r.avg_pps_usd != null);
    const avgPps = withPps.length
      ? withPps.reduce((s, r) => s + r.avg_pps_usd * r.with_pps, 0) / Math.max(1, withPps.reduce((s, r) => s + r.with_pps, 0))
      : null;
    return { listings, avgPps };
  }, [indexRows]);

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

  return (
    <DashboardWidget
      title="Market intelligence"
      subtitle={`District indexes in USD · FX 1 USD = ${market?.fxRateEtbPerUsd ?? "—"} ETB · ${market?.opportunities ?? 0} opportunities`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl options={DATASET_OPTIONS} value={dataset} onChange={setDataset} size="sm" aria-label="Index dataset" />
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <Button variant="secondary" onClick={downloadExport} disabled={exporting}>
            {exporting ? "Preparing Excel…" : "Export all properties (Excel)"}
          </Button>
          <p className="text-[11px] text-muted">CSV opens in Excel · cleaned classes, USD/m², canonical sub-city</p>
          {exportError ? <p className="text-xs text-destructive">{exportError}</p> : null}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={dashStat}>
          <span className={dashStatValue}>{totals.listings}</span>
          <span className={dashStatLabel}>Active listings (dataset)</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{formatPps(totals.avgPps)}</span>
          <span className={dashStatLabel}>Avg USD/m²</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{marketIndex?.compareDate ? marketIndex.compareDate.slice(5) : "—"}</span>
          <span className={dashStatLabel}>Compared to snapshot</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{priceHistory.listingsWithChanges ?? 0}</span>
          <span className={dashStatLabel}>Listings with price changes</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
          {propertyClass === "apartment" ? "Apartment" : "House"} · {listingMode === "rent" ? "Rent" : "Sale"} by sub-city
        </h3>
        <p className={cn(dashMuted, "mb-3")}>
          Unified canonical districts · USD only ·{" "}
          {propertyClass === "land" ? "USD / land m²" : "USD / living m²"} · month-over-month vs prior snapshot
        </p>
        {indexRows.length === 0 ? (
          <p className={dashMuted}>No index data yet for this dataset.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-muted/40 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Sub-city</th>
                  <th className="px-3 py-2 font-medium text-right">Listings</th>
                  <th className="px-3 py-2 font-medium text-right">Volume Δ</th>
                  <th className="px-3 py-2 font-medium text-right">Avg USD</th>
                  <th className="px-3 py-2 font-medium text-right">USD/m²</th>
                  <th className="px-3 py-2 font-medium text-right">Price Δ</th>
                </tr>
              </thead>
              <tbody>
                {indexRows.map((row) => (
                  <tr key={`${row.district}-${row.property_class}-${row.listing_mode}`} className="border-t border-line">
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
                    <td className="px-3 py-2 text-right tabular-nums">{row.listing_count}</td>
                    <td className="px-3 py-2 text-right">
                      <MomCell pct={row.mom_count_pct} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatUsd(row.avg_price_usd)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatPps(row.avg_pps_usd)}</td>
                    <td className="px-3 py-2 text-right">
                      <MomCell pct={row.mom_pps_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!marketIndex?.compareDate ? (
          <p className={cn(dashMuted, "mt-2")}>
            Month-over-month arrows appear after the first daily snapshot (about 30 days of history, or once a prior month exists).
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
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">All listings by sub-city</h3>
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
