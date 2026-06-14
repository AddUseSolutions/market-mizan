import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useLanguage } from "../context/LanguageContext";
import { uniqueSortedAreas } from "../utils/areaOptions";
import { Input, Select, Button } from "./ui";
import { cn } from "../utils/cn";

function SearchBar({
  compact = false,
  showListingMode = true,
  listingsPath = "/",
  variant = "default",
  onOpenMoreFilters
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [listingMode, setListingMode] = useState("");
  const [property_type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [area, setArea] = useState("");
  const [options, setOptions] = useState({ cities: [], areas: [], property_types: [] });
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

    params.delete("city");

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

  const toggleListingModeNav = (mode) => {
    mergeNavigate((p) => {
      const current = p.get("listing_mode") || "";
      if (current === mode) p.delete("listing_mode");
      else p.set("listing_mode", mode);
    });
  };

  const areaChoices = uniqueSortedAreas(options.areas || []);

  const modeBtn = (active) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary"
    );

  return (
    <form
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 shadow-soft",
        compact && "p-2",
        isHeroWalde && "flex-col sm:flex-row"
      )}
      onSubmit={submit}
    >
      {isHeroWalde ? (
        <div className="flex w-full rounded-lg border border-line p-1 sm:w-auto" role="tablist" aria-label={t("searchBuy")}>
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_sale"}
            className={modeBtn(listingModeUrl === "for_sale")}
            onClick={() => toggleListingModeNav("for_sale")}
          >
            {t("searchBuy")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_rent"}
            className={modeBtn(listingModeUrl === "for_rent")}
            onClick={() => toggleListingModeNav("for_rent")}
          >
            {t("searchRent")}
          </button>
        </div>
      ) : null}
      {showListingMode && !isHeroWalde ? (
        <div className="flex rounded-lg border border-line p-1" role="group" aria-label="Listing mode">
          <button
            type="button"
            className={modeBtn(listingMode === "for_rent")}
            onClick={() => setListingMode((m) => (m === "for_rent" ? "" : "for_rent"))}
          >
            {t("searchForRent")}
          </button>
          <button
            type="button"
            className={modeBtn(listingMode === "for_sale")}
            onClick={() => setListingMode((m) => (m === "for_sale" ? "" : "for_sale"))}
          >
            {t("searchForSale")}
          </button>
        </div>
      ) : null}
      <Input
        className={cn("min-w-[140px] flex-1", isHeroWalde && "w-full sm:flex-[2]")}
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select className="min-w-[120px] flex-1" value={property_type} onChange={(e) => setType(e.target.value)} aria-label={t("searchType")}>
        <option value="">{t("searchType")}</option>
        {(options.property_types || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
      <Select className="min-w-[100px] flex-1" value={area} onChange={(e) => setArea(e.target.value)} aria-label={t("searchArea")}>
        <option value="">{t("searchArea")}</option>
        {areaChoices.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      <Select className="min-w-[100px]" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} aria-label={t("searchBedrooms")}>
        <option value="">{t("searchBedrooms")}</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </Select>
      {isHeroWalde && typeof onOpenMoreFilters === "function" ? (
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-primary hover:text-primary"
          onClick={onOpenMoreFilters}
          aria-label={t("moreFilters")}
          title={t("moreFilters")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6" />
            <circle cx="10" cy="6" r="1.6" fill="currentColor" />
            <circle cx="16" cy="12" r="1.6" fill="currentColor" />
            <circle cx="10" cy="18" r="1.6" fill="currentColor" />
          </svg>
        </button>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto">{t("searchSubmit")}</Button>
    </form>
  );
}

export default SearchBar;
