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
    <section className="dash-widget dash-widget--market">
      <header className="dash-widget-header">
        <h2 className="dash-widget-title">Market intelligence</h2>
        <p className="dash-widget-sub">
          FX 1 USD = {market?.fxRateEtbPerUsd ?? "—"} ETB · {market?.opportunities ?? 0} opportunities
        </p>
      </header>

      <div className="dash-hmlo-grid">
        {Object.entries(hmloLabels).map(([key, label]) => (
          <div key={key} className={`dash-hmlo-chip dash-hmlo-chip--${key}`}>
            <span className="dash-stat-value">{dist[key] ?? 0}</span>
            <span className="dash-stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="dash-neighborhood-cols">
        <div>
          <h3 className="dash-section-label">Rent medians (top woredas)</h3>
          {rentAreas.length === 0 ? (
            <p className="dash-meta-muted">Not enough rent data.</p>
          ) : (
            <ul className="dash-mini-table">
              {rentAreas.slice(0, 6).map((n) => (
                <li key={`rent-${n.area}`}>
                  <span>{n.area}</span>
                  <span>${n.median_pps_usd ?? "—"}/m²</span>
                  <span className="dash-meta-muted">{n.listing_count} listings</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="dash-section-label">Sale medians (top woredas)</h3>
          {saleAreas.length === 0 ? (
            <p className="dash-meta-muted">Not enough sale data.</p>
          ) : (
            <ul className="dash-mini-table">
              {saleAreas.slice(0, 6).map((n) => (
                <li key={`sale-${n.area}`}>
                  <span>{n.area}</span>
                  <span>${n.median_pps_usd ?? "—"}/m²</span>
                  <span className="dash-meta-muted">{n.listing_count} listings</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
