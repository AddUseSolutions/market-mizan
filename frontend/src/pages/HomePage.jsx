import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import RecommendationsSection from "../components/RecommendationsSection";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";
import { useLanguage } from "../context/LanguageContext";

const PAGE_SIZE = 10;

const QUICK_FILTERS = [
  { label: "2 Bedrooms · Bole · ETB 80–100k", params: { bedrooms: "2", area: "Bole", min_price: "615", max_price: "769" } },
  { label: "3 Bedrooms · rent", params: { bedrooms: "3", listing_mode: "for_rent" } },
  { label: "Apartments · for sale", params: { property_type: "Apartment For Sale", listing_mode: "for_sale" } }
];

function HomePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const { t } = useLanguage();

  const sort = params.get("sort") || "ranked";

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
      city: params.get("city") || "",
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

  return (
    <main className="home-page">
      <section className="hero home-hero">
        <div className="container">
          <span className="hero-pill">{t("heroPill")}</span>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSub")}</p>
          <div className="hero-cta-row">
            <Link className="button hero-upload-cta" to="/list-your-property">Upload your listing</Link>
          </div>
          <SearchBar
            variant="heroWalde"
            showListingMode={false}
            onOpenMoreFilters={() => setMoreFiltersOpen(true)}
          />
          <div className="hero-quick-filters" role="group" aria-label="Popular searches">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                className="hero-quick-filter-chip"
                onClick={() => applyQuickFilter(f.params)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <HomeMoreFiltersModal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} />
      <RecommendationsSection />
      <section className="home-listings">
        <div className="container section-space home-listings-inner">
          <header className="home-listings-header home-listings-header--with-sort">
            <div>
              <p className="home-listings-eyebrow">Properties</p>
              <h2 className="home-listings-title">
                {loading ? "Loading listings…" : `${data.total || 0} listings`}
              </h2>
            </div>
            <label className="home-sort-above-grid">
              <span className="home-sort-above-grid-label">Sort</span>
              <select
                className="home-sort-above-grid-select"
                value={sort}
                onChange={(e) => onChangeParam("sort", e.target.value)}
                disabled={loading}
                aria-label="Sort listings"
              >
                <option value="ranked">Recommended</option>
                <option value="latest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="size_desc">Size</option>
              </select>
            </label>
          </header>

          <div className="home-listings-toolbar">
            <p className="home-listings-subtitle muted-inline">
              Showing {PAGE_SIZE} per page{data.totalPages > 1 ? ` · Page ${data.page || 1} of ${data.totalPages}` : ""}
            </p>
          </div>

        {loading ? <p className="home-loading">Loading listings…</p> : null}

        {!loading && data.properties.length > 0 ? (
          <div className="home-listing-grid">
            {data.properties.map((property) => (
              <PropertyCard key={property.property_id} property={property} variant="home" />
            ))}
          </div>
        ) : null}

        {!loading && data.properties.length === 0 ? (
          <div className="empty-state">
            <h3>No listings match these filters</h3>
            <p>Try switching between buy and rent, clearing filters in the hero search, or run a fresh scraper sync.</p>
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
