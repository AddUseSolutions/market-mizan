import { DashboardWidget, dashStat, dashStatValue, dashStatLabel, dashMuted } from "./DashboardWidget";
import { cn } from "../../utils/cn";

const hmloColors = {
  opportunity: "border-primary/30 bg-primary/5",
  low: "border-destructive/30 bg-destructive/5",
  medium: "border-warning/30 bg-warning/5",
  high: "border-success/30 bg-success/5"
};

export default function MarketIntelligenceWidget({ market }) {
  const dist = market?.hmloDistribution || {};
  const rentAreas = market?.neighborhoods?.rent || [];
  const saleAreas = market?.neighborhoods?.sale || [];

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

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Rent medians (top woredas)</h3>
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
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Sale medians (top woredas)</h3>
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
