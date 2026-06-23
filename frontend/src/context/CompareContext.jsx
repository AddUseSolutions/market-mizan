import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const MAX_COMPARE = 4;
const STORAGE_KEY = "mm_compare_v1";

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
