import { useLanguage } from "../context/LanguageContext";

function FilterSidebar({ filters, options, onChange, onReset }) {
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      <h3>{t("filtersTitle")}</h3>
      <label>{t("filterListingMode")}
        <div className="listing-mode-toggle listing-mode-toggle-compact" role="group" aria-label={t("filterListingMode")}>
          <button
            type="button"
            className={`listing-mode-btn ${filters.listing_mode === "for_rent" ? "listing-mode-btn-active" : ""}`}
            onClick={() => onChange("listing_mode", filters.listing_mode === "for_rent" ? "" : "for_rent")}
          >
            {t("searchForRent")}
          </button>
          <button
            type="button"
            className={`listing-mode-btn ${filters.listing_mode === "for_sale" ? "listing-mode-btn-active" : ""}`}
            onClick={() => onChange("listing_mode", filters.listing_mode === "for_sale" ? "" : "for_sale")}
          >
            {t("searchForSale")}
          </button>
        </div>
      </label>
      <label>{t("filterMinPrice")}
        <input type="number" value={filters.min_price} onChange={(e) => onChange("min_price", e.target.value)} />
      </label>
      <label>{t("filterMaxPrice")}
        <input type="number" value={filters.max_price} onChange={(e) => onChange("max_price", e.target.value)} />
      </label>
      <label>{t("filterType")}
        <select value={filters.property_type} onChange={(e) => onChange("property_type", e.target.value)}>
          <option value="">{t("filterAll")}</option>
          {(options.property_types || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </label>
      <label>{t("filterArea")}
        <select value={filters.area} onChange={(e) => onChange("area", e.target.value)}>
          <option value="">{t("filterAll")}</option>
          {(options.areas || []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>{t("filterSource")}
        <input value={filters.source} onChange={(e) => onChange("source", e.target.value)} placeholder="realethio.com" />
      </label>
      <button onClick={onReset}>{t("filterReset")}</button>
    </aside>
  );
}

export default FilterSidebar;
