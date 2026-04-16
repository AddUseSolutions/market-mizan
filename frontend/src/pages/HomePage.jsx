import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";

const PAGE_SIZE = 10;

const HOME_FILTER_PARAM_KEYS = [
  "search",
  "listing_mode",
  "property_type",
  "bedrooms",
  "area",
  "district",
  "min_price",
  "max_price",
  "min_size",
  "max_size",
  "bathrooms",
  "furnished",
  "source"
];

function HomePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const sort = params.get("sort") || "latest";

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
      area: params.get("area") || params.get("district") || "",
      source: params.get("source") || "",
      page: Number(params.get("page") || 1),
      limit: PAGE_SIZE,
      sort
    }),
    [params, sort]
  );

  const hasActiveFilters = useMemo(() => {
    if (HOME_FILTER_PARAM_KEYS.some((k) => Boolean(String(params.get(k) ?? "").trim()))) return true;
    const p = Number(params.get("page") || 1);
    return p > 1;
  }, [params]);

  const resetFilters = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      HOME_FILTER_PARAM_KEYS.forEach((k) => next.delete(k));
      next.delete("page");
      return next;
    });
  };

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

  return (
    <main className="home-page">
      <section className="hero home-hero">
        <div className="container">
          <span className="hero-pill">Trusted Property Aggregator for Addis Ababa</span>
          <h1>Find your next home in Addis Ababa</h1>
          <p>
            Explore high-quality rental and sale listings with clear prices, large photos and neighborhood context.
          </p>
          <div className="hero-cta-row">
            <Link className="button hero-upload-cta" to="/list-your-property">Upload your listing</Link>
          </div>
          <SearchBar
            variant="heroWalde"
            showListingMode={false}
            onOpenMoreFilters={() => setMoreFiltersOpen(true)}
          />
        </div>
      </section>
      <HomeMoreFiltersModal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} />
      <section className="home-listings">
        <div className="container section-space home-listings-inner">
          <header className="home-listings-header home-listings-header--with-sort">
            <div>
              <p className="home-listings-eyebrow">Properties</p>
              <h2 className="home-listings-title">
                {loading ? "Loading listings…" : `${data.total || 0} listings`}
              </h2>
            </div>
            <div className="home-listings-header-actions">
              <label className="home-sort-above-grid">
                <span className="home-sort-above-grid-label">Sort</span>
                <select
                  className="home-sort-above-grid-select"
                  value={sort}
                  onChange={(e) => onChangeParam("sort", e.target.value)}
                  disabled={loading}
                  aria-label="Sort listings"
                >
                  <option value="latest">Newest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="size_desc">Size</option>
                </select>
              </label>
              <button
                type="button"
                className="home-reset-filters-btn"
                onClick={resetFilters}
                disabled={!hasActiveFilters || loading}
                aria-label="Reset filters"
                title="Reset filters"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 1 6 2.3L21 3"
                  />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v7h7"
                  />
                </svg>
              </button>
            </div>
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
