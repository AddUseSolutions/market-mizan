import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";

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

  const areaChoices = uniqueSortedAreas(options.areas || []);

  return (
    <form
      className={`searchbar ${compact ? "compact" : ""} ${
        showListingMode && !isHeroWalde ? "" : "searchbar-no-mode"
      } ${isHeroWalde ? "searchbar-hero-walde" : ""}`}
      onSubmit={submit}
    >
      {isHeroWalde ? (
        <div className="walde-mode-toggle walde-mode-toggle--inline" role="tablist" aria-label="Kaufen oder mieten">
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_sale"}
            className={`walde-mode-option ${listingModeUrl === "for_sale" ? "walde-mode-option-active" : ""}`}
            onClick={() => setListingModeNav("for_sale")}
          >
            Kaufen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_rent"}
            className={`walde-mode-option ${listingModeUrl === "for_rent" ? "walde-mode-option-active" : ""}`}
            onClick={() => setListingModeNav("for_rent")}
          >
            Mieten
          </button>
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
      <input
        className={isHeroWalde ? "searchbar-keyword" : undefined}
        placeholder="Search by area or keyword"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
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
      {isHeroWalde && typeof onOpenMoreFilters === "function" ? (
        <button
          type="button"
          className="searchbar-more-filters-icon"
          onClick={onOpenMoreFilters}
          aria-label="More filters"
          title="More filters"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6"
            />
            <circle cx="10" cy="6" r="1.6" fill="currentColor" />
            <circle cx="16" cy="12" r="1.6" fill="currentColor" />
            <circle cx="10" cy="18" r="1.6" fill="currentColor" />
          </svg>
        </button>
      ) : null}
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchBar;
