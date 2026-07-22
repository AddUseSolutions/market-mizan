import { useNavigate } from "react-router-dom";
import { useCompare } from "../context/CompareContext";
import { useLanguage } from "../context/LanguageContext";
import CardImageCarousel from "./CardImageCarousel";
import CardListingPrice, { listingModeBadgeLabel } from "./CardListingPrice";
import CompareListIcon from "./CompareListIcon";
import { formatLivingArea, isVerifiedListing } from "../utils/pricing";
import { formatFurnishedStatus } from "../utils/furnished";
import { cleanTitle, trimDisplayText } from "../utils/cleanTitle";
import { localizeListingTitle } from "../utils/localizeListingTitle";
import { IconBed, IconRuler, IconArmchair, IconChevronRight } from "./icons/HeroIcons";
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

function galleryImages(value) {
  return asArray(value).filter(
    (u) => typeof u === "string" && u.trim() && !/\/maps\//i.test(u) && !/_t_w_(?:1\d{2}|[1-9]\d?)_/i.test(u)
  );
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

function displayTitle(property, lang = "en") {
  const raw = cleanTitle(String(property?.title || "").trim());
  const base =
    raw && !/^Listing\s/i.test(raw)
      ? raw
      : cleanTitle(titleFromUrl(property?.detail_url)) || "Property";
  return localizeListingTitle(base, lang);
}

function LocationPin() {
  return (
    <svg className="shrink-0 text-primary" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function ListingCardBody({ property, title, images, verified, location, t, selected, selectDisabled, onToggleSelect }) {
  const bedrooms = property.bedrooms != null && property.bedrooms !== "" ? String(property.bedrooms) : "—";
  const livingArea = formatLivingArea(property) || "—";
  const furnished = formatFurnishedStatus(property, t);
  const modeLabel = listingModeBadgeLabel(property, t);

  return (
    <>
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-line/30", !images.length && "flex items-center justify-center")}>
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
        <span className="absolute left-3 top-3 rounded-full bg-brand-deep px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {modeLabel}
        </span>
        {verified ? (
          <span className="absolute right-3 top-3 rounded-full bg-verified px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            ✔ {t("verified")}
          </span>
        ) : null}
      </div>

      <CardListingPrice property={property} onRequestLabel={t("priceOnRequest")} t={t} variant="bar" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-semibold leading-snug text-brand-deep">{title}</h3>
          <p className="mt-1.5 flex items-center gap-1 text-sm text-muted">
            <LocationPin />
            <span className="truncate">{location}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5 border-t border-line pt-3 sm:gap-2" aria-label={title}>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <IconBed className="shrink-0 text-muted" size={16} />
              <span className="truncate text-sm font-semibold text-brand-deep">{bedrooms}</span>
            </div>
            <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted sm:text-xs">{t("bedrooms")}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <IconRuler className="shrink-0 text-muted" size={16} />
              <span className="truncate text-sm font-semibold text-brand-deep">{livingArea}</span>
            </div>
            <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted sm:text-xs">{t("livingArea")}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <IconArmchair className="shrink-0 text-muted" size={16} />
              <span className="truncate text-sm font-semibold text-brand-deep">{furnished}</span>
            </div>
            <span className="mt-0.5 block truncate text-[10px] leading-tight text-muted sm:text-xs">{t("furnishedLabel")}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
          <span className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-primary-dark">
            {t("viewDetails")}
            <IconChevronRight className="text-white" size={16} />
          </span>
          <CompareListIcon
            showLabel
            selected={selected}
            disabled={selectDisabled}
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.();
            }}
          />
        </div>
      </div>
    </>
  );
}

function PropertyCard({ property }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { isSelected, canSelect, toggleProperty } = useCompare();
  const images = galleryImages(property.images);
  const title = displayTitle(property, lang);
  const verified = isVerifiedListing(property);
  const location = trimDisplayText(
    property.location_area?.trim() || property.location_district || ""
  ) || "—";
  const selected = isSelected(property.property_id);
  const selectDisabled = !canSelect(property.property_id);

  function openDetails() {
    navigate(`/property/${property.property_id}`);
  }

  return (
    <article
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        verified && "ring-1 ring-verified/30",
        selected && "ring-2 ring-primary"
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
        selected={selected}
        selectDisabled={selectDisabled}
        onToggleSelect={() => toggleProperty(property)}
      />
    </article>
  );
}

export default PropertyCard;
