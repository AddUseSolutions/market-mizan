import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import MapView from "../components/MapView";
import PropertyCard from "../components/PropertyCard";
import PropertyGallery from "../components/PropertyGallery";
import PropertyContactForm from "../components/PropertyContactForm";
import ListingRemovalForm from "../components/ListingRemovalForm";
import ReviewsSection from "../components/ReviewsSection";
import ConfirmListingButton from "../components/ConfirmListingButton";
import SupplierLinks from "../components/SupplierLinks";
import { HmloBadge, HmloLearnMore } from "../components/HmloBadge";
import { useAuth } from "../context/AuthContext";
import {
  formatDisplayPrice,
  formatPricePerSqm,
  hasPlausiblePrice,
  isVerifiedListing
} from "../utils/pricing";
import { isAdminUser } from "../utils/roles";
import { useLanguage } from "../context/LanguageContext";

function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

function formatSyncedAt(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function formatHistoryPrice(h) {
  const etb = h.price_etb != null ? Number(h.price_etb) : null;
  const usd = h.price_usd != null ? Number(h.price_usd) : null;
  if (Number.isFinite(etb) && etb > 0 && Number.isFinite(usd) && usd > 0) {
    return `ETB ${Math.round(etb).toLocaleString("en-US")} ($${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
  }
  if (Number.isFinite(etb) && etb > 0) {
    return `ETB ${Math.round(etb).toLocaleString("en-US")}`;
  }
  if (Number.isFinite(usd) && usd > 0) {
    return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return "—";
}

function SpecRow({ label, value, empty = "—" }) {
  const display = value === null || value === undefined || value === "" ? empty : value;
  return (
    <div className="detail-spec-row">
      <div className="detail-spec-label">{label}</div>
      <div className="detail-spec-value">{display}</div>
    </div>
  );
}

function SpecCell({ label, value, emphasize = false, empty = "—" }) {
  const display = value === null || value === undefined || value === "" ? empty : value;
  return (
    <div className={`detail-spec-cell ${emphasize ? "detail-spec-cell-emphasis" : ""}`}>
      <div className="detail-spec-cell-label">{label}</div>
      <div className="detail-spec-cell-value">{display}</div>
    </div>
  );
}

function PropertyDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [property, setProperty] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState(null);
  const [contactTitle, setContactTitle] = useState("Contact us");
  const [removalOpen, setRemovalOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    api.get(`/properties/${id}`).then((r) => {
      const p = { ...r.data, images: ensureArray(r.data.images), features: ensureArray(r.data.features) };
      setProperty(p);
      const sim = { limit: 4 };
      if (p.location_area) sim.area = String(p.location_area).trim();
      return api.get("/properties", { params: sim });
    }).then((r) => setSimilar(r.data.properties || [])).catch(() => {});
  }, [id, user?.role, isAuthenticated]);

  useEffect(() => {
    if (!isAdmin || !id) {
      setPriceHistory([]);
      return;
    }
    api.get(`/properties/${id}/price-history`).then((h) => setPriceHistory(h.data || [])).catch(() => setPriceHistory([]));
  }, [id, isAdmin]);

  function openContact({ message, title = "Contact us" } = {}) {
    setContactMessage(message || null);
    setContactTitle(title);
    setContactOpen(true);
  }

  function handleServiceRequest(service) {
    const message = `Hello,

I am interested in holistic services for this property:
• ${service.label} — ${service.desc}

Property: ${property?.title || property?.property_id}
Reference: ${property?.property_id}

Please contact me with next steps.

Kind regards`;
    openContact({ message, title: `Request: ${service.label}` });
  }

  if (!property) return <main className="container"><p>Loading property…</p></main>;

  const synced = formatSyncedAt(property.scraped_at);
  const verified = isVerifiedListing(property);
  const priceStr = formatDisplayPrice(property, { onRequestLabel: t("priceOnRequest") });
  const sqm = formatPricePerSqm(property);
  const sourceLabel = property.source_name || "source platform";
  const fxNote =
    property.fx_rate_date && hasPlausiblePrice(property)
      ? `ETB rate as of ${property.fx_rate_date}`
      : null;
  const district = property.location_district?.trim();
  const area = property.location_area?.trim();
  const city = property.location_city?.trim() || "Addis Ababa";
  const districtLower = (district || "").toLowerCase();

  const addressParts = [];
  if (district) addressParts.push(district);
  if (area && !districtLower.includes(area.toLowerCase())) addressParts.push(area);
  if (city && !districtLower.includes(city.toLowerCase())) addressParts.push(city);

  const fullAddress = addressParts.join(", ") || city;
  const displayDescription = property.description_original || property.description || "";

  return (
    <main className={`property-detail${verified ? " property-detail--verified" : ""}`}>
      <div className="detail-gallery">
        <PropertyGallery images={property.images} />
      </div>

      <div className="container section-space">
        <div className="detail-top">
          <Link className="detail-back" to="/">
            ← Back to listings
          </Link>
          <button type="button" className="button detail-contact-btn" onClick={() => openContact()}>
            Contact us
          </button>
        </div>

        <header className="detail-header">
          <div className="detail-header-main">
            <h1 className="detail-title">{property.title}</h1>
            {verified ? <span className="detail-verified-badge">✔ {t("verified")}</span> : null}
            {!verified ? (
              <p className="detail-trust-notice" role="note">{t("unverifiedNotice")}</p>
            ) : null}
            <p className="detail-kicker">{fullAddress}</p>
            <p className="detail-ref muted-inline">
              Reference · {property.property_id}
              {property.property_type ? ` · ${property.property_type}` : ""}
            </p>
          </div>

          <aside className="detail-header-aside" aria-label="Key figures">
            <div className="detail-spec-grid">
              <SpecCell label="Price" value={priceStr} emphasize />
              {sqm ? <SpecCell label="Price / m²" value={sqm} /> : null}
              {isAdmin ? (
                <SpecCell label="Price guidance" value={<HmloBadge score={property.hmlo_score} />} />
              ) : null}
              <SpecCell label="Object type" value={property.property_type} />
              <SpecCell label="Status" value={property.property_status} />
            </div>
          </aside>
        </header>

        {(isAdmin || isAuthenticated) ? (
          <div className="detail-meta-bar">
            {isAdmin ? (
              <p className="detail-meta-item">
                <span className="detail-meta-key">Listing details updated (RealEthio)</span>
                <span className="detail-meta-val">
                  {property.source_listing_updated
                    ? property.source_listing_updated
                    : "Not available — run the scraper once so we can store the “Updated on …” line from the listing."}
                </span>
              </p>
            ) : null}
            <p className="detail-meta-item">
              <span className="detail-meta-key">Last synced to Market Mizan</span>
              <span className="detail-meta-val">{synced || "—"}</span>
            </p>
            {fxNote ? (
              <p className="detail-meta-item">
                <span className="detail-meta-key">USD conversion</span>
                <span className="detail-meta-val">{fxNote}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="detail-source-line">
          Source:{" "}
          {property.detail_url ? (
            <a href={property.detail_url} target="_blank" rel="noreferrer">{sourceLabel}</a>
          ) : (
            sourceLabel
          )}
        </p>

        <div className="detail-facts-row" role="list" aria-label="Key facts">
          <div className="detail-fact" role="listitem">
            <div className="detail-fact-value">{property.bedrooms ?? "—"}</div>
            <div className="detail-fact-label">Bedrooms</div>
          </div>
          <div className="detail-fact" role="listitem">
            <div className="detail-fact-value">{property.bathrooms ?? "—"}</div>
            <div className="detail-fact-label">Bathrooms</div>
          </div>
          <div className="detail-fact" role="listitem">
            <div className="detail-fact-value">{property.property_size_m2 != null ? `${property.property_size_m2} m²` : "—"}</div>
            <div className="detail-fact-label">Living area (ca.)</div>
          </div>
          <div className="detail-fact" role="listitem">
            <div className="detail-fact-value">{property.land_area_m2 != null ? `${property.land_area_m2} m²` : "—"}</div>
            <div className="detail-fact-label">Land area</div>
          </div>
          <div className="detail-fact" role="listitem">
            <div className="detail-fact-value">{property.furnished ? "Yes" : "No"}</div>
            <div className="detail-fact-label">Furnished</div>
          </div>
        </div>

        {isAdmin ? <HmloLearnMore property={property} /> : null}

        {isAdmin && priceHistory.length > 0 ? (
          <>
            <h2 className="detail-section-title">Price history</h2>
            <ul className="price-history-list">
              {priceHistory.map((h, i) => (
                <li key={i}>
                  {new Date(h.recorded_at).toLocaleDateString("en-GB")}: {formatHistoryPrice(h)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <ConfirmListingButton propertyId={property.property_id} />

        <div className="detail-body">
          <div className="detail-body-main">
            {displayDescription ? (
              <p className="detail-description">{displayDescription}</p>
            ) : (
              <p className="muted-inline">No description available.</p>
            )}
            {isAdmin && property.description_summary ? (
              <aside className="admin-description-preview" aria-label="Admin AI summary preview">
                <h3 className="admin-description-preview-title">Admin preview: AI summary</h3>
                <p className="admin-description-preview-body">{property.description_summary}</p>
              </aside>
            ) : null}
            <h2 className="detail-section-title">Features</h2>
            <div className="detail-features">
              {property.features.length ? (
                property.features.map((f) => (
                  <div key={f} className="detail-feature">
                    <span className="detail-feature-check" aria-hidden>
                      ✓
                    </span>
                    <span>{f}</span>
                  </div>
                ))
              ) : (
                <p className="muted-inline">No features listed.</p>
              )}
            </div>
          </div>

          <aside className="detail-body-aside" aria-label="Property specifications">
            <h2 className="detail-section-title">Specifications</h2>
            <div className="detail-spec-table" role="table" aria-label="Property specification table">
              <SpecRow label="Property ID" value={property.property_id} />
              {isAdmin ? <SpecRow label="Listing updated (source site)" value={property.source_listing_updated} /> : null}
              <SpecRow label="Floor" value={property.floor} />
              <SpecRow label="Garage spaces" value={property.garage} />
              <SpecRow label="Area" value={property.location_area?.trim()} />
              <SpecRow label="District" value={property.location_district} />
              <SpecRow label="City" value={property.location_city || "Addis Ababa"} />
            </div>
          </aside>
        </div>

        <h2 className="detail-section-title">Location</h2>
        <MapView lat={property.latitude} lng={property.longitude} mapUrl={property.google_maps_url} />

        <div className="detail-removal-section">
          {!removalOpen ? (
            <button type="button" className="detail-removal-toggle" onClick={() => setRemovalOpen(true)}>
              Request removal of this listing
            </button>
          ) : (
            <ListingRemovalForm property={property} onClose={() => setRemovalOpen(false)} />
          )}
        </div>
        <SupplierLinks onServiceRequest={handleServiceRequest} />
        <ReviewsSection propertyId={property.property_id} />

        <h2 className="detail-section-title">Similar listings</h2>
        <div className="home-listing-grid home-listing-grid--detail">
          {similar.filter((x) => x.property_id !== property.property_id).slice(0, 4).map((item) => (
            <PropertyCard key={item.property_id} property={item} variant="home" />
          ))}
        </div>
        <p>
          <Link className="detail-back" to="/">
            ← Back to listings
          </Link>
        </p>

        {contactOpen ? (
          <div className="contact-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contact-form-title">
            <div className="contact-modal-card">
              <button
                type="button"
                className="contact-modal-close"
                aria-label="Close contact form"
                onClick={() => setContactOpen(false)}
              >
                x
              </button>
              <PropertyContactForm
                property={property}
                addressLine={fullAddress}
                inModal
                onClose={() => setContactOpen(false)}
                initialMessage={contactMessage}
                formTitle={contactTitle}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default PropertyDetailPage;
