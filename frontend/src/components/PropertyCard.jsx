import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import DisplayPrice from "./DisplayPrice";
import CardImageCarousel from "./CardImageCarousel";
import {
  formatLivingArea,
  hasPlausiblePrice,
  isRentalListing,
  isVerifiedListing
} from "../utils/pricing";

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

function HomeWaldeCard({ property, title, images, verified, plausible, location, t }) {
  const rental = isRentalListing(property);
  const bedrooms = property.bedrooms ? String(property.bedrooms) : "—";
  const livingArea = formatLivingArea(property) || "—";
  const priceLabel = rental ? t("rentPrice") : t("salePrice");

  return (
    <>
      <div className={`card-media-wrap card-media-wrap--walde${images.length ? "" : " card-media-wrap--empty"}`}>
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
        {verified ? <span className="card-verified-badge card-verified-badge--walde">✔ {t("verified")}</span> : null}
      </div>
      <div className="card-body card-body--walde">
        <h3 className="card-walde-title">{title}</h3>
        <p className="card-walde-location">
          <LocationPin />
          <span>{location}</span>
        </p>
        <div className="card-walde-stats" aria-label={title}>
          <div className="card-walde-stat card-walde-stat--price">
            <span className="card-walde-stat-value">
              {plausible ? (
                <DisplayPrice property={property} onRequestLabel={t("priceOnRequest")} className="display-price--card" />
              ) : (
                t("priceOnRequest")
              )}
            </span>
            <span className="card-walde-stat-label">{priceLabel}</span>
          </div>
          <div className="card-walde-stat">
            <span className="card-walde-stat-value">{bedrooms}</span>
            <span className="card-walde-stat-label">{t("bedrooms")}</span>
          </div>
          <div className="card-walde-stat">
            <span className="card-walde-stat-value">{livingArea}</span>
            <span className="card-walde-stat-label">{t("livingArea")}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function PropertyCard({ property, variant = "default" }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const images = asArray(property.images);
  const title = displayTitle(property);
  const isHome = variant === "home";
  const verified = isVerifiedListing(property);
  const plausible = hasPlausiblePrice(property);
  const sourceName = property.source_name || "source platform";
  const location = property.location_area?.trim() || property.location_district || "Addis Ababa";
  const livingArea = formatLivingArea(property);

  function openDetails() {
    navigate(`/property/${property.property_id}`);
  }

  return (
    <article
      className={`card card-link${isHome ? " card--home card--walde" : ""}${verified ? " card--verified" : ""}`}
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
      {isHome ? (
        <HomeWaldeCard
          property={property}
          title={title}
          images={images}
          verified={verified}
          plausible={plausible}
          location={location}
          t={t}
        />
      ) : (
        <>
          <div className={`card-media-wrap${images.length ? "" : " card-media-wrap--empty"}`}>
            <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
            <div className="card-media-overlay" />
            <span className="card-source-badge">{sourceName}</span>
            {verified ? <span className="card-verified-badge">✔ {t("verified")}</span> : null}
          </div>
          <div className="card-body">
            <h3>{title}</h3>
            <p className={`price${!plausible ? " price--on-request" : ""}`}>
              <DisplayPrice property={property} onRequestLabel={t("priceOnRequest")} />
            </p>
            <p className="card-meta">
              {property.bedrooms || 0} {t("bedrooms")} · {property.bathrooms || 0} {t("baths")} · {t("livingArea")}{" "}
              {livingArea || "—"}
            </p>
            <p className="card-location">{location}</p>
            <p className="card-disclaimer">{t("cardDisclaimer", { source: sourceName })}</p>
            <div className="card-actions">
              <button type="button" className="button card-button card-button-pseudo" onClick={(e) => { e.stopPropagation(); openDetails(); }}>
                {t("viewDetails")}
              </button>
              <button
                type="button"
                className="button card-button card-button-contact"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/contact?property_id=${encodeURIComponent(property.property_id)}&title=${encodeURIComponent(title)}`);
                }}
              >
                Contact Us
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default PropertyCard;
