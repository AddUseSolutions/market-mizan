import { useLanguage } from "../context/LanguageContext";
import { useSearchBarState } from "../hooks/useSearchBarState";
import { GROUPED_TYPE_OPTIONS } from "../utils/propertyTypeOptions";
import { cn } from "../utils/cn";
import {
  IconHouse,
  IconKey,
  IconSearch,
  IconBuilding,
  IconMapPin,
  IconBed,
  IconSliders,
  IconArrowRight
} from "./icons/HeroIcons";

function HeroSelect({ icon: Icon, label, value, onChange, children, className }) {
  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-3.5">
        <Icon className="shrink-0 text-muted" size={20} />
        <select
          value={value}
          onChange={onChange}
          aria-label={label}
          className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-medium text-text outline-none"
        >
          {children}
        </select>
        <svg className="pointer-events-none shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </label>
  );
}

export default function HeroSearchCard({ onOpenMoreFilters }) {
  const { t } = useLanguage();
  const {
    search,
    setSearch,
    property_type,
    setTypeFilter,
    bedrooms,
    setBedrooms,
    area,
    setArea,
    areaChoices,
    listingModeUrl,
    submit,
    toggleListingModeNav
  } = useSearchBarState({ showListingMode: false, syncListingModeFromUrl: true });

  const buyActive = listingModeUrl === "for_sale";
  const rentActive = listingModeUrl === "for_rent";

  const modeSegment = (active) =>
    cn(
      "flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold transition-colors",
      active
        ? "bg-primary text-white shadow-soft"
        : "border border-line bg-white text-muted"
    );

  const modeIconClass = (active) => (active ? "text-white" : "text-muted");

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-hero-card sm:p-5"
    >
      <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label={t("searchBuy")}>
        <button
          type="button"
          role="tab"
          aria-selected={buyActive}
          className={modeSegment(buyActive)}
          onClick={() => toggleListingModeNav("for_sale")}
        >
          <IconHouse className={modeIconClass(buyActive)} size={22} />
          {t("searchBuy")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rentActive}
          className={modeSegment(rentActive)}
          onClick={() => toggleListingModeNav("for_rent")}
        >
          <IconKey className={modeIconClass(rentActive)} size={22} />
          {t("searchRent")}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-3.5">
        <IconSearch className="shrink-0 text-muted" size={20} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted/70"
        />
      </div>

      <div className="mb-3">
        <HeroSelect
          icon={IconBuilding}
          label={t("searchType")}
          value={property_type}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">{t("searchType")}</option>
          {GROUPED_TYPE_OPTIONS.map(({ categoryKey, options }) => (
            <optgroup key={categoryKey} label={t(categoryKey)}>
              {options.map((opt) => (
                <option key={opt.groupKey} value={opt.groupKey}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </optgroup>
          ))}
        </HeroSelect>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <HeroSelect icon={IconMapPin} label={t("searchArea")} value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">{t("searchArea")}</option>
          {areaChoices.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </HeroSelect>
        <HeroSelect icon={IconBed} label={t("searchBedrooms")} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
          <option value="">{t("searchBedrooms")}</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </HeroSelect>
        {typeof onOpenMoreFilters === "function" ? (
          <button
            type="button"
            onClick={onOpenMoreFilters}
            aria-label={t("moreFilters")}
            title={t("moreFilters")}
            className="flex h-[52px] w-full items-center justify-center rounded-2xl border-2 border-line text-brand-deep transition-colors hover:border-primary hover:text-primary sm:w-[52px]"
          >
            <IconSliders className="text-muted" size={20} />
          </button>
        ) : null}
      </div>

      <button
        type="submit"
        className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-base font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        <span>{t("searchSubmit")}</span>
        <IconArrowRight size={22} />
      </button>
    </form>
  );
}
