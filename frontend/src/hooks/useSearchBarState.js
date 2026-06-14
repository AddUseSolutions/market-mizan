import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";

export function useSearchBarState({
  listingsPath = "/",
  showListingMode = true,
  syncListingModeFromUrl = false
} = {}) {
  const [search, setSearch] = useState("");
  const [listingMode, setListingMode] = useState("");
  const [property_type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [area, setArea] = useState("");
  const [options, setOptions] = useState({ cities: [], areas: [], property_types: [] });
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const listingModeUrl = urlParams.get("listing_mode") || "";

  useEffect(() => {
    api.get("/filters/options").then((r) => setOptions(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setSearch(urlParams.get("search") || "");
    if (showListingMode && !syncListingModeFromUrl) {
      setListingMode(urlParams.get("listing_mode") || "");
    }
    setType(urlParams.get("property_type") || "");
    setBedrooms(urlParams.get("bedrooms") || "");
    setArea(urlParams.get("area") || urlParams.get("district") || "");
  }, [urlParams, showListingMode, syncListingModeFromUrl]);

  const mergeNavigate = (mutate) => {
    const params = new URLSearchParams(urlParams);
    mutate(params);
    params.set("page", "1");
    const q = params.toString();
    navigate(q ? `${listingsPath}?${q}` : listingsPath);
  };

  const submit = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams(urlParams);
    if (search) params.set("search", search);
    else params.delete("search");

    if (showListingMode && !syncListingModeFromUrl) {
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

  const toggleListingModeNav = (mode) => {
    mergeNavigate((p) => {
      const current = p.get("listing_mode") || "";
      if (current === mode) p.delete("listing_mode");
      else p.set("listing_mode", mode);
    });
  };

  const areaChoices = uniqueSortedAreas(options.areas || []);

  return {
    search,
    setSearch,
    listingMode,
    setListingMode,
    property_type,
    setType,
    bedrooms,
    setBedrooms,
    area,
    setArea,
    options,
    listingModeUrl,
    areaChoices,
    submit,
    toggleListingModeNav
  };
}
