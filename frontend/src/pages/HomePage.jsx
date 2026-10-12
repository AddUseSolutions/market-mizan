import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import HomeHero from "../components/HomeHero";
import HomeMapTeaser from "../components/HomeMapTeaser";
import Pagination from "../components/Pagination";
import RecommendationsSection from "../components/RecommendationsSection";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";
import ActiveFilterChips from "../components/ActiveFilterChips";
import ListingErrorBoundary from "../components/ListingErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isAdminUser } from "../utils/roles";
import { DEFAULT_CITY } from "../constants/location";
import { omitEmptyParams } from "../utils/apiParams";
import { formatInteger } from "../utils/formatNumber";
import { track } from "../utils/track";
import { Container, Section, Select, Eyebrow } from "../components/ui";

const PAGE_SIZE = 12;

const QUICK_FILTERS = [
  { labelKey: "quickFilter1", params: { area: "Bole", property_type_group: "residential_apartment" } },
  { labelKey: "quickFilter2", params: { bedrooms: "2", listing_mode: "for_rent" } },
  { labelKey: "quickFilter3", params: { property_type_group: "residential_villa", listing_mode: "for_sale" } },
];

const FILTER_KEYS = [
  "search", "listing_mode", "property_type", "property_type_group", "bedrooms",
  "area", "district", "min_price", "max_price", "price_currency", "min_size", "max_size",
  "bathrooms", "furnished", "source",
];

/** Compact, human-readable description of the active search for analytics. */
function searchSummary(f) {
  const parts = [];
  if (f.search) parts.push(`"${String(f.search).trim().toLowerCase()}"`);
  if (f.listing_mode) parts.push(f.listing_mode === "for_rent" ? "rent" : f.listing_mode === "for_sale" ? "sale" : f.listing_mode);
  if (f.property_type_group || f.property_type) parts.push(String(f.property_type_group || f.property_type).replace(/^(residential|commercial)_/, ""));
  if (f.area) parts.push(f.area);
  if (f.bedrooms) parts.push(`${f.bedrooms} bd`);
  if (f.bathrooms) parts.push(`${f.bathrooms} ba`);
  if (f.min_price || f.max_price) parts.push(`${f.min_price || 0}–${f.max_price || "∞"} ${String(f.price_currency || "usd").toUpperCase()}`);
  if (f.min_size || f.max_size) parts.push(`${f.min_size || 0}–${f.max_size || "∞"} m²`);
  if (f.furnished) parts.push("furnished");
  if (f.source) parts.push(`source:${f.source}`);
  return parts.join(" · ");
}

function HomePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [dataKey, setDataKey] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);

  const sort = params.get("sort") || "ranked";
  const searchKey = params.toString();

  const filters = useMemo(
    () =>
      omitEmptyParams({
        search: params.get("search") || "",
        listing_mode: params.get("listing_mode") || "",
        property_type: params.get("property_type") || "",
        property_type_group: params.get("property_type_group") || "",
        bedrooms: params.get("bedrooms") || "",
        min_price: params.get("min_price") || "",
        max_price: params.get("max_price") || "",
        price_currency: params.get("price_currency") || "usd",
        min_size: params.get("min_size") || "",
        max_size: params.get("max_size") || "",
        bathrooms: params.get("bathrooms") || "",
        furnished: params.get("furnished") || "",
        city: DEFAULT_CITY,
        area: params.get("area") || params.get("district") || "",
        source: params.get("source") || "",
        page: Number(params.get("page") || 1),
        limit: PAGE_SIZE,
        sort
      }),
    [searchKey, sort]
  );

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const showLoading = loading || dataKey !== filtersKey;
  const trackedSearchRef = useRef("");

  useEffect(() => {
    if (showLoading || filters.page > 1) return;
    const label = searchSummary(filters);
    if (!label || trackedSearchRef.current === label) return;
    trackedSearchRef.current = label;
    track("search", { label, value: data.total });
  }, [showLoading, filters, data.total]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/properties", { params: filters, timeout: 30000 })
      .then((r) => {
        if (cancelled) return;
        const d = r.data || {};
        setData({
          properties: Array.isArray(d.properties) ? d.properties : [],
          total: Number(d.total) || 0,
          page: Number(d.page) || 1,
          totalPages: Number(d.totalPages) || 1
        });
        setDataKey(filtersKey);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load listings:", err?.message || err);
        setData({ properties: [], total: 0, page: 1, totalPages: 1 });
        setDataKey(filtersKey);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, filtersKey]);

  const onChangeParam = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.set("page", "1");
      return next;
    });
  };

  function applyQuickFilter(filterParams) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(filterParams).forEach(([k, v]) => next.set(k, v));
      next.set("page", "1");
      return next;
    });
  }

  function removeFilter(key, value) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value !== undefined) {
        if (value) next.set(key, value);
        else next.delete(key);
      } else {
        next.delete(key);
      }
      if (key === "area") next.delete("district");
      next.set("page", "1");
      return next;
    });
  }

  function clearAllFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      FILTER_KEYS.forEach((k) => next.delete(k));
      next.set("page", "1");
      return next;
    });
  }

  const pageSubtitle =
    !showLoading && data.totalPages > 1
      ? ` · ${t("pageOf", { page: data.page || 1, total: data.totalPages })}`
      : "";

  const sortControl = (
    <label className="flex w-full items-center gap-2 sm:w-auto">
      <span className="text-sm text-muted">{t("sort")}</span>
      <Select
        className="min-w-0 flex-1 sm:w-auto sm:min-w-[160px]"
        value={sort}
        onChange={(e) => onChangeParam("sort", e.target.value)}
        disabled={showLoading}
        aria-label={t("sort")}
      >
        <option value="ranked">{t("sortRecommended")}</option>
        <option value="latest">{t("sortLatest")}</option>
        <option value="price_asc">{t("sortPriceAsc")}</option>
        <option value="price_desc">{t("sortPriceDesc")}</option>
        <option value="size_desc">{t("sortSize")}</option>
      </Select>
    </label>
  );

  return (
    <main>
      <HomeHero
        quickFilters={QUICK_FILTERS}
        onQuickFilter={applyQuickFilter}
        onOpenMoreFilters={() => setMoreFiltersOpen(true)}
      />
      {isAdmin ? <HomeMapTeaser /> : null}
      <HomeMoreFiltersModal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} />
      <RecommendationsSection />
      <Section className="pt-8 sm:pt-12">
        <Container>
          <header className="mb-6">
            <Eyebrow>{t("properties")}</Eyebrow>
            <h2 className="mt-1 text-2xl font-semibold text-brand-deep">
              {showLoading ? t("loadingListings") : `${formatInteger(data.total || 0)} ${t("listingsCount")}`}
            </h2>

            <div className="mt-4 flex flex-col gap-3 sm:hidden">
              {sortControl}
              <p className="text-sm text-muted">
                {t("showingPerPage", { n: PAGE_SIZE })}{pageSubtitle}
              </p>
            </div>

            <div className="mt-4 hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-muted">
                {t("showingPerPage", { n: PAGE_SIZE })}{pageSubtitle}
              </p>
              {sortControl}
            </div>
          </header>

          <ActiveFilterChips
            params={params}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
            className="mb-6"
          />

          {showLoading ? <p className="text-muted">{t("loadingListings")}</p> : null}

          {!showLoading && data.properties.length > 0 ? (
            <ListingErrorBoundary>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.properties.map((property) => (
                  <PropertyCard key={property.property_id} property={property} />
                ))}
              </div>
            </ListingErrorBoundary>
          ) : null}

          {!showLoading && data.properties.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-soft">
              <h3 className="text-lg font-semibold text-heading">{t("noListingsTitle")}</h3>
              <p className="mt-2 text-muted">{t("noListingsBody")}</p>
            </div>
          ) : null}

          {!showLoading ? (
            <div className="mt-8">
              <Pagination
                variant="walde"
                page={data.page || 1}
                totalPages={data.totalPages || 1}
                onChange={(p) => onChangeParam("page", String(p))}
              />
            </div>
          ) : null}
        </Container>
      </Section>
    </main>
  );
}

export default HomePage;
