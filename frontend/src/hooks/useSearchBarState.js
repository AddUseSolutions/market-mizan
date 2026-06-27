import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";
import { GROUPED_TYPE_OPTIONS, TYPE_GROUP_PATTERNS } from "../utils/propertyTypeOptions";

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinCsv(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).join(",");
}

export function useSearchBarState({
  listingsPath = "/",
  showListingMode = true,
  syncListingModeFromUrl = false
} = {}) {
  const [search, setSearch] = useState("");
  const [listingMode, setListingMode] = useState("");
  const [property_types, setPropertyTypes] = useState([]);
  const [bedrooms, setBedrooms] = useState("");
  const [areas, setAreas] = useState([]);
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
    const groupRaw = urlParams.get("property_type_group") || "";
    const typeRaw = urlParams.get("property_type") || "";
    setPropertyTypes(splitCsv(groupRaw || typeRaw));
    setBedrooms(urlParams.get("bedrooms") || "");
    setAreas(splitCsv(urlParams.get("area") || urlParams.get("district") || ""));
  }, [urlParams, showListingMode, syncListingModeFromUrl]);

  const mergeNavigate = (mutate) => {
    const params = new URLSearchParams(urlParams);
    mutate(params);
    params.set("page", "1");
    const q = params.toString();
    navigate(q ? `${listingsPath}?${q}` : listingsPath);
  };

  const setTypeFilters = (values) => {
    const next = Array.isArray(values) ? values : [];
    setPropertyTypes(next);
    mergeNavigate((params) => {
      params.delete("property_type");
      params.delete("property_type_group");
      if (!next.length) return;
      const groups = next.filter((v) => TYPE_GROUP_PATTERNS[v]);
      const types = next.filter((v) => !TYPE_GROUP_PATTERNS[v]);
      if (groups.length) params.set("property_type_group", joinCsv(groups));
      if (types.length) params.set("property_type", joinCsv(types));
    });
  };

  const setAreaFilters = (values) => {
    const next = Array.isArray(values) ? values : [];
    setAreas(next);
    mergeNavigate((params) => {
      params.delete("district");
      if (!next.length) params.delete("area");
      else params.set("area", joinCsv(next));
    });
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

    params.delete("property_type");
    params.delete("property_type_group");
    if (property_types.length) {
      const groups = property_types.filter((v) => TYPE_GROUP_PATTERNS[v]);
      const types = property_types.filter((v) => !TYPE_GROUP_PATTERNS[v]);
      if (groups.length) params.set("property_type_group", joinCsv(groups));
      if (types.length) params.set("property_type", joinCsv(types));
    }

    if (bedrooms) params.set("bedrooms", bedrooms);
    else params.delete("bedrooms");

    params.delete("city");
    params.delete("district");
    if (areas.length) params.set("area", joinCsv(areas));
    else params.delete("area");

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
  const typeChoices = GROUPED_TYPE_OPTIONS.flatMap(({ options: opts }) =>
    opts.map((opt) => ({ value: opt.groupKey, labelKey: opt.labelKey }))
  );

  return {
    search,
    setSearch,
    listingMode,
    setListingMode,
    property_types,
    setPropertyTypes: setTypeFilters,
    property_type: property_types[0] || "",
    setType: (value) => setTypeFilters(value ? [value] : []),
    setTypeFilter: (value) => setTypeFilters(value ? [value] : []),
    bedrooms,
    setBedrooms,
    areas,
    setAreas: setAreaFilters,
    area: areas[0] || "",
    setArea: (value) => setAreaFilters(value ? [value] : []),
    options,
    listingModeUrl,
    areaChoices,
    typeChoices,
    submit,
    toggleListingModeNav
  };
}
