import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import CardImageCarousel from "./CardImageCarousel";
import CardListingPrice from "./CardListingPrice";
import { formatLivingArea, isVerifiedListing } from "../utils/pricing";
import { formatFurnishedStatus } from "../utils/furnished";
import { cleanTitle, trimDisplayText } from "../utils/cleanTitle";
import { Badge } from "./ui";
import { cn } from "../utils/cn";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function titleFromUrl(url) {
  if (!url) return "";
  try {
    const slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "";
  }
}

function displayTitle(property) {
  const raw = cleanTitle(String(property?.title || "").trim());
  if (raw && !/^Listing\s/i.test(raw)) return raw;
  const fallback = cleanTitle(titleFromUrl(property?.detail_url)) || "Property";
  return fallback;
}

function LocationPin() {
  return (
    <svg className="shrink-0 text-accent" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function ListingCardBody({ property, title, images, verified, location, t }) {
  const bedrooms = property.bedrooms != null && property.bedrooms !== "" ? String(property.bedrooms) : "—";
  const livingArea = formatLivingArea(property) || "—";
  const furnished = formatFurnishedStatus(property, t);

  return (
    <>
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-line/30", !images.length && "flex items-center justify-center")}>
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
        {verified ? (
          <Badge className="absolute left-3 top-3 bg-verified text-white" variant="default">
            ✔ {t("verified")}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <CardListingPrice property={property} onRequestLabel={t("priceOnRequest")} t={t} />
          <div>
            <h3 className="line-clamp-2 font-semibold text-heading">{title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <LocationPin />
              <span className="truncate">{location}</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3" aria-label={title}>
          <div>
            <span className="block text-xs text-muted">{t("bedrooms")}</span>
            <span className="text-sm font-medium text-text">{bedrooms}</span>
          </div>
          <div>
            <span className="block text-xs text-muted">{t("livingArea")}</span>
            <span className="text-sm font-medium text-text">{livingArea}</span>
          </div>
          <div>
            <span className="block text-xs text-muted">{t("furnishedLabel")}</span>
            <span className="text-sm font-medium text-text">{furnished}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function PropertyCard({ property }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const images = asArray(property.images);
  const title = displayTitle(property);
  const verified = isVerifiedListing(property);
  const location = trimDisplayText(
    property.location_area?.trim() || property.location_district || ""
  ) || "—";

  function openDetails() {
    navigate(`/property/${property.property_id}`);
  }

  return (
    <article
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border border-line bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        verified && "ring-1 ring-verified/30"
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open listing: ${title}`}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      }}
    >
      <ListingCardBody
        property={property}
        title={title}
        images={images}
        verified={verified}
        location={location}
        t={t}
      />
    </article>
  );
}

export default PropertyCard;
