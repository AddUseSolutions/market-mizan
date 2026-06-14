import { useLanguage } from "../context/LanguageContext";
import { useSearchBarState } from "../hooks/useSearchBarState";
import { cn } from "../utils/cn";
import {
  IconHouse,
  IconSearch,
  IconBuilding,
  IconArea,
  IconBed,
  IconSliders,
  IconArrowRight
} from "./icons/HeroIcons";

function HeroSelect({ icon: Icon, label, value, onChange, children, className }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3.5">
        <Icon className="shrink-0 text-gold" size={20} />
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
  } = useSearchBarState({ showListingMode: false, syncListingModeFromUrl: true });

  const buyActive = listingModeUrl !== "for_rent";
  const rentActive = listingModeUrl === "for_rent";

  const modeSegment = (active) =>
    cn(
      "flex h-14 flex-1 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors",
      active
        ? "bg-hero-navy text-white"
        : "bg-gray-100 text-muted"
    );

  const modeIconClass = (active) => (active ? "text-gold" : "text-muted");

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
          <IconHouse className={modeIconClass(buyActive)} />
          {t("searchBuy")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rentActive}
          className={modeSegment(rentActive)}
          onClick={() => toggleListingModeNav("for_rent")}
        >
          <IconHouse className={modeIconClass(rentActive)} />
          {t("searchRent")}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3.5">
        <IconSearch className="shrink-0 text-gold" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted/70"
        />
      </div>

      <div className="mb-3">
        <HeroSelect icon={IconBuilding} label={t("searchType")} value={property_type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t("searchType")}</option>
          {(options.property_types || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </HeroSelect>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <HeroSelect icon={IconArea} label={t("searchArea")} value={area} onChange={(e) => setArea(e.target.value)}>
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
            className="flex h-[52px] w-full items-center justify-center rounded-xl border-2 border-gold text-hero-navy transition-colors hover:bg-gold/10 sm:w-[52px]"
          >
            <IconSliders className="text-hero-navy" />
          </button>
        ) : null}
      </div>

      <button
        type="submit"
        className="flex h-14 w-full items-center justify-between rounded-xl bg-hero-navy px-5 text-base font-semibold text-white transition-colors hover:bg-hero-navy-deep"
      >
        <span>{t("searchSubmit")}</span>
        <IconArrowRight className="text-gold" />
      </button>
    </form>
  );
}
