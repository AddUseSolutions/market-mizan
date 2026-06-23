import { Link } from "react-router-dom";
import CardImageCarousel from "./CardImageCarousel";
import { displayCompareTitle } from "../utils/compareProperty";
import { parsePropertyImages } from "../utils/propertyImages";

export default function CompareImagePanel({ property, label, t }) {
  if (!property) return null;
  const images = parsePropertyImages(property);
  const title = displayCompareTitle(property);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="border-b border-line bg-brand-muted/30 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">{label}</p>
        <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-brand-deep">{title}</h2>
        <Link
          to={`/property/${property.property_id}`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t("viewDetails")} →
        </Link>
      </div>
      <div className="relative aspect-[16/10] min-h-[180px] bg-line/30">
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
      </div>
    </div>
  );
}
