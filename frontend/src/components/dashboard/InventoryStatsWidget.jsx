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
    <section className="dash-widget dash-widget--inventory">
      <header className="dash-widget-header">
        <h2 className="dash-widget-title">Inventory overview</h2>
        <p className="dash-widget-sub">System-wide property counts</p>
      </header>

      <div className="dash-inventory-grid">
        {tiles.map((t) => (
          <div key={t.label} className="dash-inventory-tile">
            <span className="dash-stat-value">{t.value ?? "—"}</span>
            <span className="dash-stat-label">{t.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
