import { useLanguage } from "../context/LanguageContext";
import { useSearchBarState } from "../hooks/useSearchBarState";
import { Input, Select, Button } from "./ui";
import { cn } from "../utils/cn";

function SearchBar({
  compact = false,
  showListingMode = true,
  listingsPath = "/",
  variant = "default",
  onOpenMoreFilters
}) {
  const { t } = useLanguage();
  const isHeroWalde = variant === "heroWalde";
  const {
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
  } = useSearchBarState({
    listingsPath,
    showListingMode,
    syncListingModeFromUrl: isHeroWalde
  });

  const modeBtn = (active) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary"
    );

  return (
    <form
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 shadow-soft",
        compact && "p-2",
        isHeroWalde && "flex-col sm:flex-row"
      )}
      onSubmit={submit}
    >
      {isHeroWalde ? (
        <div className="flex w-full rounded-lg border border-line p-1 sm:w-auto" role="tablist" aria-label={t("searchBuy")}>
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_sale"}
            className={modeBtn(listingModeUrl === "for_sale")}
            onClick={() => toggleListingModeNav("for_sale")}
          >
            {t("searchBuy")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listingModeUrl === "for_rent"}
            className={modeBtn(listingModeUrl === "for_rent")}
            onClick={() => toggleListingModeNav("for_rent")}
          >
            {t("searchRent")}
          </button>
        </div>
      ) : null}
      {showListingMode && !isHeroWalde ? (
        <div className="flex rounded-lg border border-line p-1" role="group" aria-label="Listing mode">
          <button
            type="button"
            className={modeBtn(listingMode === "for_rent")}
            onClick={() => setListingMode((m) => (m === "for_rent" ? "" : "for_rent"))}
          >
            {t("searchForRent")}
          </button>
          <button
            type="button"
            className={modeBtn(listingMode === "for_sale")}
            onClick={() => setListingMode((m) => (m === "for_sale" ? "" : "for_sale"))}
          >
            {t("searchForSale")}
          </button>
        </div>
      ) : null}
      <Input
        className={cn("min-w-[140px] flex-1", isHeroWalde && "w-full sm:flex-[2]")}
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select className="min-w-[120px] flex-1" value={property_type} onChange={(e) => setType(e.target.value)} aria-label={t("searchType")}>
        <option value="">{t("searchType")}</option>
        {(options.property_types || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
      <Select className="min-w-[100px] flex-1" value={area} onChange={(e) => setArea(e.target.value)} aria-label={t("searchArea")}>
        <option value="">{t("searchArea")}</option>
        {areaChoices.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      <Select className="min-w-[100px]" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} aria-label={t("searchBedrooms")}>
        <option value="">{t("searchBedrooms")}</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </Select>
      {isHeroWalde && typeof onOpenMoreFilters === "function" ? (
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-primary hover:text-primary"
          onClick={onOpenMoreFilters}
          aria-label={t("moreFilters")}
          title={t("moreFilters")}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M4 6h6M14 6h6M4 12h16M4 18h6M14 18h6" />
            <circle cx="10" cy="6" r="1.6" fill="currentColor" />
            <circle cx="16" cy="12" r="1.6" fill="currentColor" />
            <circle cx="10" cy="18" r="1.6" fill="currentColor" />
          </svg>
        </button>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto">{t("searchSubmit")}</Button>
    </form>
  );
}

export default SearchBar;
