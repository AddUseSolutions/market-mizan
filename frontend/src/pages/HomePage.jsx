import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";

const PAGE_SIZE = 10;

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
