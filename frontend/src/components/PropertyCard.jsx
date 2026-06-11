import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import CardImageCarousel from "./CardImageCarousel";
import CardListingPrice from "./CardListingPrice";
import { formatLivingArea, isVerifiedListing } from "../utils/pricing";
import { formatFurnishedStatus } from "../utils/furnished";

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
  const raw = String(property?.title || "").trim();
  if (raw && !/^Listing\s/i.test(raw)) return raw;
  return titleFromUrl(property?.detail_url) || "Property in Addis Ababa";
}

function LocationPin() {
  return (
    <svg className="card-walde-pin" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
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
      <div className={`card-media-wrap card-media-wrap--walde${images.length ? "" : " card-media-wrap--empty"}`}>
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
        {verified ? <span className="card-verified-badge card-verified-badge--walde">✔ {t("verified")}</span> : null}
      </div>
      <div className="card-body card-body--walde">
        <div className="card-walde-head">
          <CardListingPrice property={property} onRequestLabel={t("priceOnRequest")} t={t} />
          <div className="card-walde-head-text">
            <h3 className="card-walde-title">{title}</h3>
            <p className="card-walde-location">
              <LocationPin />
              <span>{location}</span>
            </p>
          </div>
        </div>
        <div className="card-walde-attrs" aria-label={title}>
          <div className="card-walde-attr">
            <span className="card-walde-attr-label">{t("bedrooms")}</span>
            <span className="card-walde-attr-value">{bedrooms}</span>
          </div>
          <div className="card-walde-attr">
            <span className="card-walde-attr-label">{t("livingArea")}</span>
            <span className="card-walde-attr-value">{livingArea}</span>
          </div>
          <div className="card-walde-attr">
            <span className="card-walde-attr-label">{t("furnishedLabel")}</span>
            <span className="card-walde-attr-value">{furnished}</span>
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
  const location = property.location_area?.trim() || property.location_district || "Addis Ababa";

  function openDetails() {
    navigate(`/property/${property.property_id}`);
  }

  return (
    <article
      className={`card card-link card--home card--walde${verified ? " card--verified" : ""}`}
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
