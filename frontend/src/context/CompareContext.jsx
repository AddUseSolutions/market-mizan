import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const MAX_COMPARE = 3;
const STORAGE_KEY = "mm_compare_v1";

function listingFingerprint(property) {
  const url = String(property?.detail_url || "");
  const fromUrl = url.match(/\/(\d{6,})\/?$/);
  if (fromUrl) {
    // Also fold near-duplicate ads (same title+price) into one compare slot via content key below.
  }
  const title = String(property?.title || "")
    .toLowerCase()
    .replace(/\s*\|\s*just property\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const price = Number(property?.price_etb != null ? property.price_etb : property?.price);
  const priceBucket = Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
  const beds = property?.bedrooms != null ? Number(property.bedrooms) : "";
  const area = String(property?.location_area || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (title && priceBucket) return `content:${title}|${priceBucket}|${beds}|${area}`;
  if (fromUrl) return `jp:${fromUrl[1]}`;
  const id = String(property?.property_id || "");
  const fromId = id.match(/(\d{6,})/);
  if (fromId) return `id:${fromId[1]}`;
  return `pid:${id}`;
}

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], compareMode: false };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, MAX_COMPARE) : [];
    return { items, compareMode: Boolean(parsed?.compareMode) };
  } catch {
    return { items: [], compareMode: false };
  }
}

function writeStored(items, compareMode) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ items, compareMode }));
  } catch {
    /* ignore quota */
  }
}

const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => readStored().items);
  const [compareMode, setCompareMode] = useState(() => readStored().compareMode);

  useEffect(() => {
    writeStored(items, compareMode);
  }, [items, compareMode]);

  const isSelected = useCallback((propertyId) => items.some((p) => p.property_id === propertyId), [items]);

  const canSelect = useCallback(
    (propertyId) => isSelected(propertyId) || items.length < MAX_COMPARE,
    [items.length, isSelected]
  );

  const toggleProperty = useCallback((property) => {
    if (!property?.property_id) return;
    setItems((prev) => {
      const exists = prev.find((p) => p.property_id === property.property_id);
      if (exists) return prev.filter((p) => p.property_id !== property.property_id);
      if (prev.length >= MAX_COMPARE) return prev;
      const fp = listingFingerprint(property);
      if (prev.some((p) => listingFingerprint(p) === fp)) return prev;
      return [...prev, property];
    });
  }, []);

  const removeProperty = useCallback((propertyId) => {
    setItems((prev) => prev.filter((p) => p.property_id !== propertyId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const enterCompareMode = useCallback(() => {
    setCompareMode(true);
  }, []);

  const exitCompareMode = useCallback(() => {
    setCompareMode(false);
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      compareMode,
      maxCompare: MAX_COMPARE,
      isFull: items.length >= MAX_COMPARE,
      isSelected,
      canSelect,
      toggleProperty,
      removeProperty,
      clear,
      enterCompareMode,
      exitCompareMode,
      setCompareMode
    }),
    [
      items,
      compareMode,
      isSelected,
      canSelect,
      toggleProperty,
      removeProperty,
      clear,
      enterCompareMode,
      exitCompareMode
    ]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
