import { Link } from "react-router-dom";
import { DashboardWidget, dashStat, dashStatValue, dashStatLabel, dashMuted } from "./DashboardWidget";
import { cn } from "../../utils/cn";

const hmloColors = {
  opportunity: "border-primary/30 bg-primary/5",
  low: "border-destructive/30 bg-destructive/5",
  medium: "border-warning/30 bg-warning/5",
  high: "border-success/30 bg-success/5"
};

function formatUsd(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

export default function MarketIntelligenceWidget({ market }) {
  const dist = market?.hmloDistribution || {};
  const rentAreas = market?.neighborhoods?.rent || [];
  const saleAreas = market?.neighborhoods?.sale || [];
  const bySubcity = market?.bySubcity || [];
  const priceHistory = market?.priceHistory || {};

  const hmloLabels = {
    opportunity: "Opportunity",
    low: "Low",
    medium: "Medium",
    high: "High"
  };

  return (
    <DashboardWidget
      title="Market intelligence"
      subtitle={`FX 1 USD = ${market?.fxRateEtbPerUsd ?? "—"} ETB · ${market?.opportunities ?? 0} opportunities`}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(hmloLabels).map(([key, label]) => (
          <div key={key} className={cn(dashStat, hmloColors[key])}>
            <span className={dashStatValue}>{dist[key] ?? 0}</span>
            <span className={dashStatLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          Categories by sub-city
        </h3>
        <p className={cn(dashMuted, "mb-3")}>
          Official Addis Ababa sub-cities — rent / sale inventory and median $/m²
        </p>
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
                  <th className="px-3 py-2 font-medium text-right">Price Δ 30d</th>
                </tr>
              </thead>
              <tbody>
                {bySubcity.map((row) => (
                  <tr key={row.area} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link
                        to={`/?area=${encodeURIComponent(row.area)}`}
                        className="font-medium text-brand-deep hover:text-primary hover:underline"
                      >
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
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      {row.price_changes_30d || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={dashStat}>
          <span className={dashStatValue}>{priceHistory.propertiesTracked ?? 0}</span>
          <span className={dashStatLabel}>Listings with price history</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{priceHistory.snapshots ?? 0}</span>
          <span className={dashStatLabel}>Price snapshots</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{priceHistory.changesLast30d ?? 0}</span>
          <span className={dashStatLabel}>Snapshots (30 days)</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{priceHistory.listingsWithChanges ?? 0}</span>
          <span className={dashStatLabel}>Listings with price changes</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Rent medians (by sub-city)
          </h3>
          {rentAreas.length === 0 ? (
            <p className={dashMuted}>Not enough rent data.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {rentAreas.slice(0, 6).map((n) => (
                <li key={`rent-${n.area}`} className="flex justify-between gap-2 border-b border-line py-1.5">
                  <span>{n.area}</span>
                  <span className="font-medium">${n.median_pps_usd ?? "—"}/m²</span>
                  <span className={dashMuted}>{n.listing_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Sale medians (by sub-city)
          </h3>
          {saleAreas.length === 0 ? (
            <p className={dashMuted}>Not enough sale data.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {saleAreas.slice(0, 6).map((n) => (
                <li key={`sale-${n.area}`} className="flex justify-between gap-2 border-b border-line py-1.5">
                  <span>{n.area}</span>
                  <span className="font-medium">${n.median_pps_usd ?? "—"}/m²</span>
                  <span className={dashMuted}>{n.listing_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardWidget>
  );
}
