import { useLanguage } from "../context/LanguageContext";
import { GROUPED_TYPE_OPTIONS } from "../utils/propertyTypeOptions";
import { cn } from "../utils/cn";

const FILTER_LABELS = {
  search: "searchPlaceholder",
  listing_mode: "filterListingMode",
  property_type: "searchType",
  property_type_group: "searchType",
  bedrooms: "moreFiltersBedrooms",
  area: "searchArea",
  min_price: "moreFiltersMinPrice",
  max_price: "moreFiltersMaxPrice",
  min_size: "moreFiltersMinSize",
  max_size: "moreFiltersMaxSize",
  bathrooms: "moreFiltersBathrooms",
  furnished: "furnishedLabel",
};

const MODE_LABELS = {
  for_rent: "searchRent",
  for_sale: "searchBuy",
};

function resolveTypeLabel(value, t) {
  for (const group of GROUPED_TYPE_OPTIONS) {
    const match = group.options.find((o) => o.groupKey === value);
    if (match) return t(match.labelKey);
  }
  return value;
}

export default function ActiveFilterChips({ params, onRemove, onClearAll, className }) {
  const { t } = useLanguage();
  const skip = new Set(["page", "limit", "sort", "city"]);
  const chips = [];

  params.forEach((value, key) => {
    if (skip.has(key) || !value) return;
    let label = FILTER_LABELS[key] ? t(FILTER_LABELS[key]) : key;
    let display = value;
    if (key === "listing_mode") display = t(MODE_LABELS[value] || value);
    else if (key === "property_type_group") display = resolveTypeLabel(value, t);
    else if (key === "furnished") display = value === "true" ? t("furnishedYes") : t("furnishedNo");
    chips.push({ key, value, text: `${label}: ${display}` });
  });

  if (!chips.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.key)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-brand-deep shadow-soft hover:border-primary"
        >
          <span className="text-primary" aria-hidden>×</span>
          {chip.text}
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-muted underline hover:text-brand-deep"
      >
        {t("filterReset")}
      </button>
    </div>
  );
}
