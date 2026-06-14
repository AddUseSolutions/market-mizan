import { DashboardWidget, dashStat, dashStatValue, dashStatLabel } from "./DashboardWidget";

export default function InventoryStatsWidget({ inventory }) {
  const inv = inventory || {};

  const tiles = [
    { label: "Total listings", value: inv.total },
    { label: "Active", value: inv.active },
    { label: "Inactive", value: inv.inactive },
    { label: "Crawled", value: inv.crawled },
    { label: "Verified", value: inv.verified },
    { label: "For rent", value: inv.rent },
    { label: "For sale", value: inv.sale }
  ];

  return (
    <DashboardWidget title="Inventory overview" subtitle="System-wide property counts">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={dashStat}>
            <span className={dashStatValue}>{t.value ?? "—"}</span>
            <span className={dashStatLabel}>{t.label}</span>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
