import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import RecommendationsSection from "../components/RecommendationsSection";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_CITY } from "../constants/location";

const PAGE_SIZE = 12;

const QUICK_FILTERS = [
  { labelKey: "quickFilter1", params: { bedrooms: "2", area: "Bole", min_price: "615", max_price: "769" } },
  { labelKey: "quickFilter2", params: { bedrooms: "3", listing_mode: "for_rent" } },
  { labelKey: "quickFilter3", params: { property_type: "Apartment For Sale", listing_mode: "for_sale" } }
];

function HomePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const { t } = useLanguage();

  const sort = params.get("sort") || "price_desc";

  const filters = useMemo(
    () => ({
      search: params.get("search") || "",
      listing_mode: params.get("listing_mode") || "",
      property_type: params.get("property_type") || "",
      bedrooms: params.get("bedrooms") || "",
      min_price: params.get("min_price") || "",
      max_price: params.get("max_price") || "",
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
    [params, sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/properties", { params: filters })
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
      })
      .catch(() => {
        if (cancelled) return;
        setData({ properties: [], total: 0, page: 1, totalPages: 1 });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

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

  const pageSubtitle = data.totalPages > 1
    ? ` · ${t("pageOf", { page: data.page || 1, total: data.totalPages })}`
    : "";

  return (
    <main className="home-page">
      <section className="hero home-hero">
        <div className="container">
          <span className="hero-pill">{t("heroPill")}</span>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSub")}</p>
          <div className="hero-cta-row">
            <Link className="button hero-upload-cta" to="/list-your-property">{t("heroUploadCta")}</Link>
          </div>
          <SearchBar
            variant="heroWalde"
            showListingMode={false}
            onOpenMoreFilters={() => setMoreFiltersOpen(true)}
          />
          <div className="hero-quick-filters" role="group" aria-label={t("popularSearches")}>
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.labelKey}
                type="button"
                className="hero-quick-filter-chip"
                onClick={() => applyQuickFilter(f.params)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </section>
      <HomeMoreFiltersModal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} />
      <RecommendationsSection />
      <section className="home-listings">
        <div className="container container--listings section-space home-listings-inner">
          <header className="home-listings-header home-listings-header--with-sort">
            <div>
              <p className="home-listings-eyebrow">{t("properties")}</p>
              <h2 className="home-listings-title">
                {loading ? t("loadingListings") : `${data.total || 0} ${t("listingsCount")}`}
              </h2>
            </div>
            <label className="home-sort-above-grid">
              <span className="home-sort-above-grid-label">{t("sort")}</span>
              <select
                className="home-sort-above-grid-select"
                value={sort}
                onChange={(e) => onChangeParam("sort", e.target.value)}
                disabled={loading}
                aria-label={t("sort")}
              >
                <option value="ranked">{t("sortRecommended")}</option>
                <option value="latest">{t("sortLatest")}</option>
                <option value="price_asc">{t("sortPriceAsc")}</option>
                <option value="price_desc">{t("sortPriceDesc")}</option>
                <option value="size_desc">{t("sortSize")}</option>
              </select>
            </label>
          </header>

          <div className="home-listings-toolbar">
            <p className="home-listings-subtitle muted-inline">
              {t("showingPerPage", { n: PAGE_SIZE })}{pageSubtitle}
            </p>
          </div>

        {loading ? <p className="home-loading">{t("loadingListings")}</p> : null}

        {!loading && data.properties.length > 0 ? (
          <div className="home-listing-grid">
            {data.properties.map((property) => (
              <PropertyCard key={property.property_id} property={property} variant="home" />
            ))}
          </div>
        ) : null}

        {!loading && data.properties.length === 0 ? (
          <div className="empty-state">
            <h3>{t("noListingsTitle")}</h3>
            <p>{t("noListingsBody")}</p>
          </div>
        ) : null}

        <Pagination
          variant="walde"
          page={data.page || 1}
          totalPages={data.totalPages || 1}
          onChange={(p) => onChangeParam("page", String(p))}
        />
        </div>
      </section>
    </main>
  );
}

export default HomePage;
