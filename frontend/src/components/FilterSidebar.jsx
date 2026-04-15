function FilterSidebar({ filters, options, onChange, onReset }) {
  return (
    <aside className="sidebar">
      <h3>Filters</h3>
      <label>Listing mode
        <div className="listing-mode-toggle listing-mode-toggle-compact" role="group" aria-label="Listing mode filter">
          <button
            type="button"
            className={`listing-mode-btn ${filters.listing_mode === "for_rent" ? "listing-mode-btn-active" : ""}`}
            onClick={() => onChange("listing_mode", filters.listing_mode === "for_rent" ? "" : "for_rent")}
          >
            For Rent
          </button>
          <button
            type="button"
            className={`listing-mode-btn ${filters.listing_mode === "for_sale" ? "listing-mode-btn-active" : ""}`}
            onClick={() => onChange("listing_mode", filters.listing_mode === "for_sale" ? "" : "for_sale")}
          >
            For Sale
          </button>
        </div>
      </label>
      <label>Min price
        <input type="number" value={filters.min_price} onChange={(e) => onChange("min_price", e.target.value)} />
      </label>
      <label>Max price
        <input type="number" value={filters.max_price} onChange={(e) => onChange("max_price", e.target.value)} />
      </label>
      <label>Type
        <select value={filters.property_type} onChange={(e) => onChange("property_type", e.target.value)}>
          <option value="">All</option>
          {(options.property_types || []).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label>Area
        <select value={filters.area} onChange={(e) => onChange("area", e.target.value)}>
          <option value="">All</option>
          {(options.areas || []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>
      <label>Source
        <input value={filters.source} onChange={(e) => onChange("source", e.target.value)} placeholder="realethio.com" />
      </label>
      <button onClick={onReset}>Reset</button>
    </aside>
  );
}

export default FilterSidebar;
