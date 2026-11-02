import { DashboardWidget, dashStat, dashStatValue, dashStatLabel } from "./DashboardWidget";

export default function InventoryStatsWidget({ inventory }) {
  const inv = inventory || {};

  const tiles = [
    { label: "On the site", value: inv.public_catalog },
    { label: "Active in database", value: inv.active },
    { label: "Inactive", value: inv.inactive },
    { label: "Crawled", value: inv.crawled },
    { label: "Verified", value: inv.verified },
    { label: "For rent", value: inv.rent },
    { label: "For sale", value: inv.sale }
  ];

  return (
    <DashboardWidget title="Inventory overview" subtitle="On the site uses the same rules as the public catalog">
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
