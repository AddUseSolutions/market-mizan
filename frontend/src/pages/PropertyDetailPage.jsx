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
import DisplayPrice from "../components/DisplayPrice";
import {
  formatLivingArea,
  formatPricePerSqm,
  hasPlausiblePrice,
  isVerifiedListing
} from "../utils/pricing";
import { isAdminUser } from "../utils/roles";
import { cleanTitle, locationKickerParts } from "../utils/cleanTitle";
import { useLanguage } from "../context/LanguageContext";
import { Container, Section, Button, Badge } from "../components/ui";
import { cn } from "../utils/cn";

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
    return `ETB ${Math.round(etb).toLocaleString("en-US")}\n$${Math.round(usd).toLocaleString("en-US")}`;
  }
  if (Number.isFinite(etb) && etb > 0) {
    return `ETB ${Math.round(etb).toLocaleString("en-US")}`;
  }
  if (Number.isFinite(usd) && usd > 0) {
    return `$${Math.round(usd).toLocaleString("en-US")}`;
  }
  return "—";
}

function SpecRow({ label, value, empty = "—" }) {
  const display = value === null || value === undefined || value === "" ? empty : value;
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <div className="text-muted">{label}</div>
      <div className="text-right font-medium text-text">{display}</div>
    </div>
  );
}

function SpecCell({ label, value, emphasize = false, empty = "—" }) {
  const display = value === null || value === undefined || value === "" ? empty : value;
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4", emphasize && "border-primary/30 bg-primary/5")}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold text-heading", emphasize && "text-primary")}>{display}</div>
    </div>
  );
}

function formatObjectTypeLabel(propertyType) {
  if (!propertyType || typeof propertyType !== "string") return null;
  const trimmed = propertyType.trim();
  const cleaned = trimmed.replace(/\s*for\s+(sale|rent)\s*$/i, "").trim();
  if (!cleaned || /^for\s+(sale|rent)$/i.test(trimmed)) return null;
  return cleaned;
}

function PropertyDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [property, setProperty] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTitle, setContactTitle] = useState(null);
  const [contactSubject, setContactSubject] = useState(null);
  const [contactServiceLabel, setContactServiceLabel] = useState(null);
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

  useEffect(() => {
    if (!contactOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setContactOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contactOpen]);

  function closeContact() {
    setContactOpen(false);
  }

  function openContact({ title = null, subject = null, serviceLabel = null } = {}) {
    setContactTitle(title);
    setContactSubject(subject);
    setContactServiceLabel(serviceLabel);
    setContactOpen(true);
  }

  if (!property) {
    return (
      <Container className="py-12">
        <p className="text-muted">{t("loadingProperty")}</p>
      </Container>
    );
  }

  const synced = formatSyncedAt(property.scraped_at);
  const verified = isVerifiedListing(property);
  const priceStr = <DisplayPrice property={property} onRequestLabel={t("priceOnRequest")} />;
  const sqm = formatPricePerSqm(property);
  const livingArea = formatLivingArea(property);
  const sourceLabel = property.source_name || t("sourcePlatform");
  const fxNote =
    property.fx_rate_date && hasPlausiblePrice(property)
      ? t("detailFxRate", { date: property.fx_rate_date })
      : null;
  const district = property.location_district?.trim();
  const area = property.location_area?.trim();
  const kickerParts = locationKickerParts({ district, area });
  const displayDescription = property.description_original || property.description || "";
  const objectTypeLabel = formatObjectTypeLabel(property.property_type);

  return (
    <main className={cn(verified && "ring-1 ring-verified/20")}>
      <PropertyGallery images={property.images} />

      <Section>
        <Container>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link className="text-sm font-medium text-primary hover:underline" to="/">
              {t("backToListings")}
            </Link>
            <Button variant="whatsapp" onClick={() => openContact()}>{t("contactUs")}</Button>
          </div>

          <header className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-start gap-3">
                <h1 className="text-2xl font-bold text-heading sm:text-3xl">{cleanTitle(property.title) || property.title}</h1>
                {verified ? (
                  <Badge className="bg-verified text-white">✔ {t("verified")}</Badge>
                ) : null}
              </div>
              {kickerParts.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Location">
                  {kickerParts.map((part) => (
                    <span key={part} className="rounded-full bg-line/50 px-3 py-1 text-sm text-muted">
                      {part}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <aside aria-label="Key figures">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <SpecCell label={t("detailPrice")} value={priceStr} emphasize />
                {sqm ? <SpecCell label={t("detailPricePerSqm")} value={<span className="whitespace-pre-line">{sqm}</span>} /> : null}
                {isAdmin ? (
                  <SpecCell label={t("detailPriceGuidance")} value={<HmloBadge score={property.hmlo_score} />} />
                ) : null}
                {objectTypeLabel ? <SpecCell label={t("detailObjectType")} value={objectTypeLabel} /> : null}
                <SpecCell label={t("detailStatus")} value={property.property_status} />
              </div>
            </aside>
          </header>

          {(isAdmin || isAuthenticated) ? (
            <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-line bg-surface p-4 text-sm">
              {isAdmin ? (
                <p>
                  <span className="font-medium text-muted">{t("detailListingUpdated")}: </span>
                  <span>{property.source_listing_updated || t("detailListingUpdatedNa")}</span>
                </p>
              ) : null}
              <p>
                <span className="font-medium text-muted">{t("detailLastSynced")}: </span>
                <span>{synced || "—"}</span>
              </p>
              {fxNote ? (
                <p>
                  <span className="font-medium text-muted">{t("detailUsdConversion")}: </span>
                  <span>{fxNote}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4 text-sm text-muted">
            {t("detailSource")}{" "}
            {isAdmin && property.detail_url ? (
              <a href={property.detail_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{sourceLabel}</a>
            ) : (
              <span className="font-medium text-text">{sourceLabel}</span>
            )}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5" role="list" aria-label="Key facts">
            {[
              { value: property.bedrooms ?? "—", label: t("bedrooms") },
              { value: property.bathrooms ?? "—", label: t("baths") },
              { value: livingArea ?? "—", label: t("livingArea") },
              {
                value: property.land_area_m2 != null
                  ? `${Math.round(Number(property.land_area_m2)).toLocaleString("en-US")} m²`
                  : "—",
                label: t("detailLandArea")
              },
              { value: property.furnished ? t("furnishedYes") : t("furnishedNo"), label: t("furnishedLabel") }
            ].map(({ value, label }) => (
              <div key={label} className="rounded-lg border border-line bg-surface p-4 text-center" role="listitem">
                <div className="text-xl font-semibold text-heading">{value}</div>
                <div className="mt-1 text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>

          {isAdmin ? <HmloLearnMore property={property} /> : null}

          {isAdmin && priceHistory.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-heading">{t("detailPriceHistory")}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {priceHistory.map((h, i) => (
                  <li key={i} className="flex justify-between rounded-lg border border-line px-4 py-2">
                    <span>{new Date(h.recorded_at).toLocaleDateString("en-GB")}</span>
                    <span className="whitespace-pre-line text-right font-medium">{formatHistoryPrice(h)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ConfirmListingButton propertyId={property.property_id} />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              {displayDescription ? (
                <p className="leading-relaxed text-text">{displayDescription}</p>
              ) : (
                <p className="text-muted">{t("detailNoDescription")}</p>
              )}
              {isAdmin && property.description_summary ? (
                <aside className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4" aria-label="Admin AI summary preview">
                  <h3 className="text-sm font-semibold text-warning">{t("detailAdminAiPreview")}</h3>
                  <p className="mt-2 text-sm text-muted">{property.description_summary}</p>
                </aside>
              ) : null}
              <h2 className="mt-8 text-xl font-semibold text-heading">{t("detailFeatures")}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {property.features.length ? (
                  property.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-accent" aria-hidden>✓</span>
                      <span>{f}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">{t("detailNoFeatures")}</p>
                )}
              </div>
            </div>

            <aside aria-label="Property specifications">
              <h2 className="text-xl font-semibold text-heading">{t("detailSpecifications")}</h2>
              <div className="mt-3 rounded-lg border border-line bg-surface p-4" role="table" aria-label={t("detailSpecifications")}>
                {isAdmin ? <SpecRow label={t("detailPropertyId")} value={property.property_id} /> : null}
                {isAdmin ? <SpecRow label={t("detailListingUpdatedSource")} value={property.source_listing_updated} /> : null}
                <SpecRow label={t("detailFloor")} value={property.floor} />
                <SpecRow label={t("detailGarageSpaces")} value={property.garage} />
                <SpecRow label={t("detailArea")} value={property.location_area?.trim()} />
                <SpecRow label={t("detailDistrict")} value={property.location_district} />
                <SpecRow label={t("detailCity")} value={property.location_city || "Addis Ababa"} />
              </div>
            </aside>
          </div>

          <h2 className="mt-8 text-xl font-semibold text-heading">{t("detailLocation")}</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <MapView lat={property.latitude} lng={property.longitude} mapUrl={property.google_maps_url} />
          </div>

          <div className="mt-8">
            {!removalOpen ? (
              <button type="button" className="text-sm text-muted underline hover:text-primary" onClick={() => setRemovalOpen(true)}>
                {t("detailRequestRemoval")}
              </button>
            ) : (
              <ListingRemovalForm property={property} onClose={() => setRemovalOpen(false)} />
            )}
          </div>
          <SupplierLinks property={property} />
          <ReviewsSection propertyId={property.property_id} />

          <h2 className="mt-10 text-xl font-semibold text-heading">{t("detailSimilarListings")}</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.filter((x) => x.property_id !== property.property_id).slice(0, 4).map((item) => (
              <PropertyCard key={item.property_id} property={item} variant="home" />
            ))}
          </div>
          <p className="mt-6">
            <Link className="text-sm font-medium text-primary hover:underline" to="/">
              {t("backToListings")}
            </Link>
          </p>

          {contactOpen ? (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-form-title"
              onClick={closeContact}
            >
              <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" aria-hidden />
              <div className="relative z-10 w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-line/50"
                  aria-label={t("closeContactForm")}
                  onClick={closeContact}
                >
                  ×
                </button>
                <PropertyContactForm
                  property={property}
                  inModal
                  onClose={closeContact}
                  formTitle={contactTitle || t("contactUs")}
                  initialSubject={contactSubject}
                  serviceLabel={contactServiceLabel}
                />
              </div>
            </div>
          ) : null}
        </Container>
      </Section>
    </main>
  );
}

export default PropertyDetailPage;
