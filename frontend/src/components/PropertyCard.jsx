import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import {
  formatEtbSecondary,
  formatUsdPrice,
  formatSyncedShort,
  hasPlausiblePrice,
  isVerifiedListing,
  pricePerSqm
} from "../utils/pricing";
import { HmloBadge } from "./HmloBadge";

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

function isNew(firstSeen) {
  if (!firstSeen) return false;
  return (new Date() - new Date(firstSeen)) / (1000 * 60 * 60) < 24;
}

function PropertyCard({ property, variant = "default" }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const images = asArray(property.images);
  const image = images[0];
  const title = displayTitle(property);
  const isHome = variant === "home";
  const verified = isVerifiedListing(property);
  const plausible = hasPlausiblePrice(property);
  const sqm = pricePerSqm(property);
  const etbSecondary = formatEtbSecondary(property);
  const sourceName = property.source_name || "source platform";
  const synced = formatSyncedShort(property.scraped_at);
  const priceLabel = formatUsdPrice(property, { onRequestLabel: t("priceOnRequest") });

  function openDetails() {
    navigate(`/property/${property.property_id}`);
  }

  return (
    <article
      className={`card card-link${isHome ? " card--home" : ""}${verified ? " card--verified" : ""}`}
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
      <div className={`card-media-wrap${image ? "" : " card-media-wrap--empty"}`}>
        {image ? (
          <img src={image} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement?.classList.add("card-media-wrap--empty"); }} />
        ) : (
          <div className="card-media-placeholder" aria-hidden>
            <span>No photo</span>
          </div>
        )}
        <div className="card-media-overlay" />
        <span className="card-source-badge">{sourceName}</span>
        {verified ? <span className="card-verified-badge">✔ {t("verified")}</span> : null}
      </div>
      <div className="card-body">
        <div className="row-between card-badges-row">
          {isNew(property.first_seen) ? <span className="new-badge">{t("newBadge")}</span> : null}
          {synced ? <span className="card-sync-badge">{t("lastSynced", { date: synced })}</span> : null}
        </div>
        <h3>{title}</h3>
        <p className={`price${!plausible ? " price--on-request" : ""}`}>
          {priceLabel}
          {etbSecondary ? <span className="price-secondary"> · {etbSecondary}</span> : null}
        </p>
        {sqm ? (
          <p className="card-price-sqm">
            ${sqm.toLocaleString("en-US")} / m² · <HmloBadge score={property.hmlo_score} />
          </p>
        ) : (
          <HmloBadge score={property.hmlo_score} />
        )}
        <p className="card-meta">
          {property.bedrooms || 0} {t("beds")} · {property.bathrooms || 0} {t("baths")} · {property.property_size_m2 || "-"} m²
        </p>
        <p className="card-location">{property.location_area?.trim() || property.location_district || "Addis Ababa"}</p>
        <p className="card-disclaimer">{t("cardDisclaimer", { source: sourceName })}</p>
        {isHome ? (
          <div className="card-actions card-actions-home">
            <button
              type="button"
              className="button card-button card-button-home-primary"
              onClick={(e) => {
                e.stopPropagation();
                openDetails();
              }}
            >
              {t("viewDetails")}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </article>
  );
}

export default PropertyCard;
