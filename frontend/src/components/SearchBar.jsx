import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";

const SORT_OPTIONS = [
  { value: "latest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "size_desc", label: "Size" }
];

function SearchBar({
  compact = false,
  showListingMode = true,
  listingsPath = "/",
  variant = "default",
  onOpenMoreFilters
}) {
  const [search, setSearch] = useState("");
  const [listingMode, setListingMode] = useState("");
  const [property_type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [area, setArea] = useState("");
  const [options, setOptions] = useState({ areas: [], property_types: [] });
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const isHeroWalde = variant === "heroWalde";
  const listingModeUrl = urlParams.get("listing_mode") || "";
  const sortUrl = urlParams.get("sort") || "latest";

  useEffect(() => {
    api.get("/filters/options").then((r) => setOptions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setSearch(urlParams.get("search") || "");
    if (showListingMode && !isHeroWalde) setListingMode(urlParams.get("listing_mode") || "");
    setType(urlParams.get("property_type") || "");
    setBedrooms(urlParams.get("bedrooms") || "");
    setArea(urlParams.get("area") || urlParams.get("district") || "");
  }, [urlParams, showListingMode, isHeroWalde]);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(urlParams);
    if (search) params.set("search", search);
    else params.delete("search");

    if (showListingMode && !isHeroWalde) {
      if (listingMode) params.set("listing_mode", listingMode);
      else params.delete("listing_mode");
    }

    if (property_type) params.set("property_type", property_type);
    else params.delete("property_type");

    if (bedrooms) params.set("bedrooms", bedrooms);
    else params.delete("bedrooms");

    if (area) params.set("area", area);
    else {
      params.delete("area");
      params.delete("district");
    }

    params.set("page", "1");
    const q = params.toString();
    navigate(q ? `${listingsPath}?${q}` : listingsPath);
  };

  const mergeNavigate = (mutate) => {
    const params = new URLSearchParams(urlParams);
    mutate(params);
    params.set("page", "1");
    const q = params.toString();
    navigate(q ? `${listingsPath}?${q}` : listingsPath);
  };

  const setListingModeNav = (mode) => {
    mergeNavigate((p) => {
      if (mode) p.set("listing_mode", mode);
      else p.delete("listing_mode");
    });
  };

  const setSortNav = (value) => {
    mergeNavigate((p) => {
      if (!value || value === "latest") p.delete("sort");
      else p.set("sort", value);
    });
  };

  const areaChoices = uniqueSortedAreas(options.areas || []);

  return (
    <form
      className={`searchbar ${compact ? "compact" : ""} ${
        showListingMode && !isHeroWalde ? "" : "searchbar-no-mode"
      } ${isHeroWalde ? "searchbar-hero-walde" : ""}`}
      onSubmit={submit}
    >
      {isHeroWalde ? (
        <div className="searchbar-hero-top">
          <div className="walde-mode-toggle walde-mode-toggle--hero" role="tablist" aria-label="Buy or rent">
            <button
              type="button"
              role="tab"
              aria-selected={listingModeUrl === "for_sale"}
              className={`walde-mode-option ${listingModeUrl === "for_sale" ? "walde-mode-option-active" : ""}`}
              onClick={() => setListingModeNav("for_sale")}
            >
              Buy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={listingModeUrl === "for_rent"}
              className={`walde-mode-option ${listingModeUrl === "for_rent" ? "walde-mode-option-active" : ""}`}
              onClick={() => setListingModeNav("for_rent")}
            >
              Rent
            </button>
          </div>
          <div className="searchbar-hero-top-right">
            <div className="walde-sort" role="group" aria-label="Sort listings">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`walde-sort-btn ${sortUrl === value ? "walde-sort-btn-active" : ""}`}
                  onClick={() => setSortNav(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {typeof onOpenMoreFilters === "function" ? (
              <button type="button" className="walde-more-filters-btn" onClick={onOpenMoreFilters}>
                More filters
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {showListingMode && !isHeroWalde ? (
        <div className="listing-mode-toggle" role="group" aria-label="Listing mode">
          <button
            type="button"
            className={`listing-mode-btn ${listingMode === "for_rent" ? "listing-mode-btn-active" : ""}`}
            onClick={() => setListingMode((m) => (m === "for_rent" ? "" : "for_rent"))}
          >
            For Rent
          </button>
          <button
            type="button"
            className={`listing-mode-btn ${listingMode === "for_sale" ? "listing-mode-btn-active" : ""}`}
            onClick={() => setListingMode((m) => (m === "for_sale" ? "" : "for_sale"))}
          >
            For Sale
          </button>
        </div>
      ) : null}
      <input placeholder="Search by area or keyword" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={property_type} onChange={(e) => setType(e.target.value)} aria-label="Type">
        <option value="">Type</option>
        {(options.property_types || []).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
        <option value="">Area</option>
        {areaChoices.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
        <option value="">Bedrooms</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </select>
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchBar;
