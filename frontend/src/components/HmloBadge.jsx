export function HmloBadge({ score }) {
  if (!score) return null;
  const labels = {
    high: "High",
    medium: "Medium",
    low: "Low",
    opportunity: "Opportunity"
  };
  return (
    <span className={`hmlo-badge hmlo-badge--${score}`} title="Price guidance vs neighborhood">
      {labels[score] || score}
    </span>
  );
}

export function HmloLearnMore({ property }) {
  if (!property?.hmlo_score) return null;
  const pps = property.price_per_sqm_usd;
  const median = property.area_median_pps_usd;
  return (
    <details className="hmlo-learn-more">
      <summary>Learn more about price guidance (HMLO)</summary>
      <p className="muted-inline">
        This listing is rated <strong>{property.hmlo_score}</strong> compared to the neighborhood median
        {median ? ` ($${Number(median).toLocaleString("en-US")}/m²)` : ""}.
        {pps ? ` Listed at $${Number(pps).toLocaleString("en-US")}/m².` : ""}
      </p>
    </details>
  );
}
