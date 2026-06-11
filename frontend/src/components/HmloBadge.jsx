import { useLanguage } from "../context/LanguageContext";

export function HmloBadge({ score }) {
  const { t } = useLanguage();
  if (!score) return null;
  const key = {
    high: "hmloHigh",
    medium: "hmloMedium",
    low: "hmloLow",
    opportunity: "hmloOpportunity"
  }[score];
  return (
    <span className={`hmlo-badge hmlo-badge--${score}`} title={t("hmloTitle")}>
      {key ? t(key) : score}
    </span>
  );
}

export function HmloLearnMore({ property }) {
  const { t } = useLanguage();
  if (!property?.hmlo_score) return null;
  const pps = property.price_per_sqm_usd;
  const median = property.area_median_pps_usd;
  const label = t({
    high: "hmloHigh",
    medium: "hmloMedium",
    low: "hmloLow",
    opportunity: "hmloOpportunity"
  }[property.hmlo_score] || "hmloMedium");
  return (
    <details className="hmlo-learn-more">
      <summary>{t("hmloTitle")}</summary>
      <p className="muted-inline">
        {label}
        {median ? ` · $${Math.round(Number(median)).toLocaleString("en-US")}/m²` : ""}
        {pps ? ` · $${Math.round(Number(pps)).toLocaleString("en-US")}/m²` : ""}
      </p>
    </details>
  );
}
