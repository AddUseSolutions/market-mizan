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
    if (isHeroWalde) return;
    if (showListingMode) setListingMode(urlParams.get("listing_mode") || "");
    setType(urlParams.get("property_type") || "");
    setBedrooms(urlParams.get("bedrooms") || "");
    setArea(urlParams.get("area") || urlParams.get("district") || "");
  }, [urlParams, showListingMode, isHeroWalde]);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(urlParams);
    if (search) params.set("search", search);
    else params.delete("search");

    if (isHeroWalde) {
      params.set("page", "1");
      const q = params.toString();
      navigate(q ? `${listingsPath}?${q}` : listingsPath);
      return;
    }

    if (showListingMode) {
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

  const filterIcon = (
    <svg className="searchbar-filter-svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M4 6h16M7 12h10M9 18h6M10 6v2M14 12v2M12 18v2"
      />
    </svg>
  );

  return (
    <form
      className={`searchbar ${compact ? "compact" : ""} ${
        isHeroWalde ? "searchbar-hero-walde" : showListingMode ? "" : "searchbar-no-mode"
      }`}
      onSubmit={submit}
    >
      {isHeroWalde ? (
        <div className="searchbar-hero-single">
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
          <input
            className="searchbar-hero-input"
            placeholder="Search by area or keyword"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by area or keyword"
          />
          <button type="submit" className="searchbar-hero-submit">
            Search
          </button>
          {typeof onOpenMoreFilters === "function" ? (
            <button
              type="button"
              className="searchbar-hero-filter-btn"
              onClick={onOpenMoreFilters}
              aria-label="More filters"
            >
              {filterIcon}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {showListingMode ? (
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
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
            <option value="">Area</option>
            {areaChoices.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
            <option value="">Bedrooms</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
          <button type="submit">Search</button>
        </>
      )}
    </form>
  );
}

export default SearchBar;
