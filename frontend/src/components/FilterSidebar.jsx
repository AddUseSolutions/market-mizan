import { useLanguage } from "../context/LanguageContext";
import { Input, Select, Button, SegmentedControl } from "./ui";

const fieldLabel = "flex flex-col gap-1.5 text-sm";

function FilterSidebar({ filters, options, onChange, onReset }) {
  const { t } = useLanguage();

  const listingModeValue =
    filters.listing_mode === "for_rent"
      ? "for_rent"
      : filters.listing_mode === "for_sale"
        ? "for_sale"
        : "";

  return (
    <aside className="rounded-xl border border-line bg-surface p-5 shadow-soft">
      <p className="eyebrow mb-1">{t("filtersTitle")}</p>
      <h3 className="mb-4 font-semibold text-heading">{t("filtersTitle")}</h3>
      <div className="flex flex-col gap-4">
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterListingMode")}</span>
          <SegmentedControl
            size="sm"
            aria-label={t("filterListingMode")}
            value={listingModeValue}
            onChange={(val) => onChange("listing_mode", val)}
            options={[
              { value: "for_rent", label: t("searchForRent") },
              { value: "for_sale", label: t("searchForSale") }
            ]}
          />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterMinPrice")}</span>
          <Input type="number" value={filters.min_price} onChange={(e) => onChange("min_price", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterMaxPrice")}</span>
          <Input type="number" value={filters.max_price} onChange={(e) => onChange("max_price", e.target.value)} />
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterType")}</span>
          <Select value={filters.property_type} onChange={(e) => onChange("property_type", e.target.value)}>
            <option value="">{t("filterAll")}</option>
            {(options.property_types || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </Select>
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterArea")}</span>
          <Select value={filters.area} onChange={(e) => onChange("area", e.target.value)}>
            <option value="">{t("filterAll")}</option>
            {(options.areas || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </label>
        <label className={fieldLabel}>
          <span className="font-medium">{t("filterSource")}</span>
          <Input value={filters.source} onChange={(e) => onChange("source", e.target.value)} placeholder="realethio.com" />
        </label>
        <Button variant="secondary" onClick={onReset}>{t("filterReset")}</Button>
      </div>
    </aside>
  );
}

export default FilterSidebar;
