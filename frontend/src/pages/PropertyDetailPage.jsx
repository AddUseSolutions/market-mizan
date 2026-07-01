import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import MapView from "../components/MapView";
import PropertyCard from "../components/PropertyCard";
import PropertyGallery from "../components/PropertyGallery";
import PropertyPricingSidebar from "../components/PropertyPricingSidebar";
import PropertyFeatureCards from "../components/PropertyFeatureCards";
import PropertyContactForm from "../components/PropertyContactForm";
import ListingRemovalForm from "../components/ListingRemovalForm";
import ReviewsSection from "../components/ReviewsSection";
import CompareAddButton from "../components/CompareAddButton";
import ConfirmListingButton from "../components/ConfirmListingButton";
import SupplierLinks from "../components/SupplierLinks";
import { HmloLearnMore } from "../components/HmloBadge";
import { listingModeBadgeLabel } from "../components/CardListingPrice";
import { useAuth } from "../context/AuthContext";
import {
  formatLivingArea,
  hasPlausiblePrice,
  isVerifiedListing
} from "../utils/pricing";
import { isAdminUser } from "../utils/roles";
import { cleanTitle, locationKickerParts } from "../utils/cleanTitle";
import { localizeListingTitle } from "../utils/localizeListingTitle";
import { extractMentionedLocations } from "../utils/locationFromText";
import { useLanguage } from "../context/LanguageContext";
import { Container, Section, Badge, SectionHeader } from "../components/ui";
import {
  IconBuilding,
  IconBed,
  IconBath,
  IconRuler,
  IconMap,
  IconArmchair,
} from "../components/icons/HeroIcons";
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

function formatObjectTypeLabel(propertyType) {
  if (!propertyType || typeof propertyType !== "string") return null;
  const trimmed = propertyType.trim();
  const cleaned = trimmed.replace(/\s*for\s+(sale|rent)\s*$/i, "").trim();
  if (!cleaned || /^for\s+(sale|rent)$/i.test(trimmed)) return null;
  return cleaned;
}

function LocationPin({ className = "" }) {
  return (
    <svg className={cn("shrink-0 text-primary", className)} viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
      />
    </svg>
  );
}

function PropertyDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
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
  const pageTitle = localizeListingTitle(cleanTitle(property.title) || property.title, lang);
  const mentionedAreas = extractMentionedLocations(
    [displayDescription, property.title].filter(Boolean).join(" ")
  );
  const objectTypeLabel = formatObjectTypeLabel(property.property_type);
  const statusLabel = listingModeBadgeLabel(property, t);

  const featureItems = [
    { value: property.bedrooms ?? "—", label: t("bedrooms"), icon: IconBed },
    { value: property.bathrooms ?? "—", label: t("baths"), icon: IconBath },
    { value: livingArea ?? "—", label: t("livingArea"), icon: IconRuler },
    {
      value: property.land_area_m2 != null
        ? `${Math.round(Number(property.land_area_m2)).toLocaleString("en-US")} m²`
        : "—",
      label: t("detailLandArea"),
      icon: IconMap,
    },
    { value: property.furnished ? t("furnishedYes") : t("furnishedNo"), label: t("furnishedLabel"), icon: IconArmchair },
  ];

  return (
    <main className={cn("w-full overflow-x-hidden", verified && "ring-1 ring-inset ring-verified/20")}>
      <Section>
        <Container className="min-w-0">
          <div className="mb-6">
            <Link className="text-sm font-medium text-primary hover:underline" to="/">
              {t("backToListings")}
            </Link>
          </div>

          <header className="mb-8">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <h1 className="min-w-0 break-words text-2xl font-bold text-brand-deep sm:text-3xl lg:text-4xl">
                {pageTitle}
              </h1>
              {verified ? (
                <Badge className="bg-verified text-white">✔ {t("verified")}</Badge>
              ) : null}
            </div>
            {kickerParts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Location">
                {kickerParts.map((part, idx) => (
                  <span
                    key={part}
                    className="inline-flex items-center gap-1.5 rounded-full bg-line/50 px-3 py-1.5 text-sm text-brand-deep"
                  >
                    {idx === 0 ? <LocationPin /> : <IconBuilding className="shrink-0 text-primary" size={14} />}
                    {part}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <div className="min-w-0 w-full">
              <PropertyGallery
                key={property.property_id}
                propertyId={property.property_id}
                images={property.images}
                statusLabel={statusLabel}
                emptyLabel={t("noPhoto")}
              />
            </div>
            <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-3 lg:col-start-2 lg:mx-0">
            <PropertyPricingSidebar
              className="w-full min-w-0"
              property={property}
              objectTypeLabel={objectTypeLabel}
              onContact={() => openContact()}
              isAdmin={isAdmin}
              t={t}
            />
            <CompareAddButton property={property} />
            </div>
          </div>

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

          <PropertyFeatureCards items={featureItems} className="mt-8" />

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

          <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
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
                      <span className="text-primary" aria-hidden>✓</span>
                      <span>{f}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">{t("detailNoFeatures")}</p>
                )}
              </div>
            </div>

            <aside className="min-w-0" aria-label="Property specifications">
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
          {mentionedAreas.length > 0 ? (
            <p className="mt-2 text-sm text-muted">
              {t("detailLocationMentioned")}: {mentionedAreas.join(", ")}
            </p>
          ) : null}
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            <MapView property={property} />
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-sm text-muted">
            <span>{t("detailSource")}</span>
            {isAdmin && property.detail_url ? (
              <a href={property.detail_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{sourceLabel}</a>
            ) : (
              <span className="font-medium text-text">{sourceLabel}</span>
            )}
          </p>

          <ConfirmListingButton propertyId={property.property_id} />

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

          <SectionHeader
            eyebrow={t("detailSpecifications")}
            title={t("detailSimilarListings")}
            className="mt-10"
          />
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
