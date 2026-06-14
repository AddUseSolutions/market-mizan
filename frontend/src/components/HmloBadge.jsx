import { useLanguage } from "../context/LanguageContext";
import { Badge } from "./ui";
import { cn } from "../utils/cn";

const scoreVariants = {
  high: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  low: "bg-destructive/10 text-destructive",
  opportunity: "bg-accent/10 text-accent"
};

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
    <Badge className={cn(scoreVariants[score])} title={t("hmloTitle")}>
      {key ? t(key) : score}
    </Badge>
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
    <details className="mt-4 rounded-lg border border-line bg-surface p-4">
      <summary className="cursor-pointer font-medium text-primary">{t("hmloTitle")}</summary>
      <p className="mt-2 text-sm text-muted">
        {label}
        {median ? ` · $${Math.round(Number(median)).toLocaleString("en-US")}/m²` : ""}
        {pps ? ` · $${Math.round(Number(pps)).toLocaleString("en-US")}/m²` : ""}
      </p>
    </details>
  );
}
