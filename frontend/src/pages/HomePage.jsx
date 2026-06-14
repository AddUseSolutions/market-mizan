import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import RecommendationsSection from "../components/RecommendationsSection";
import HomeMoreFiltersModal from "../components/HomeMoreFiltersModal";
import ListingErrorBoundary from "../components/ListingErrorBoundary";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_CITY } from "../constants/location";
import { omitEmptyParams } from "../utils/apiParams";
import { Container, Section, Button, Select } from "../components/ui";

const PAGE_SIZE = 12;

const QUICK_FILTERS = [
  { labelKey: "quickFilter1", params: { bedrooms: "2", area: "Bole", min_price: "615", max_price: "769" } },
  { labelKey: "quickFilter2", params: { bedrooms: "3", listing_mode: "for_rent" } },
  { labelKey: "quickFilter3", params: { property_type: "Apartment For Sale", listing_mode: "for_sale" } }
];

function HomePage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const { t } = useLanguage();

  const sort = params.get("sort") || "price_desc";
  const searchKey = params.toString();

  const filters = useMemo(
    () =>
      omitEmptyParams({
        search: params.get("search") || "",
        listing_mode: params.get("listing_mode") || "",
        property_type: params.get("property_type") || "",
        bedrooms: params.get("bedrooms") || "",
        min_price: params.get("min_price") || "",
        max_price: params.get("max_price") || "",
        min_size: params.get("min_size") || "",
        max_size: params.get("max_size") || "",
        bathrooms: params.get("bathrooms") || "",
        furnished: params.get("furnished") || "",
        city: DEFAULT_CITY,
        area: params.get("area") || params.get("district") || "",
        source: params.get("source") || "",
        page: Number(params.get("page") || 1),
        limit: PAGE_SIZE,
        sort
      }),
    [searchKey, sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/properties", { params: filters, timeout: 30000 })
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load listings:", err?.message || err);
        setData({ properties: [], total: 0, page: 1, totalPages: 1 });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const onChangeParam = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.set("page", "1");
      return next;
    });
  };

  function applyQuickFilter(filterParams) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(filterParams).forEach(([k, v]) => next.set(k, v));
      next.set("page", "1");
      return next;
    });
  }

  const pageSubtitle = data.totalPages > 1
    ? ` · ${t("pageOf", { page: data.page || 1, total: data.totalPages })}`
    : "";

  return (
    <main>
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-10 sm:py-14">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl lg:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{t("heroSub")}</p>
          <div className="mt-6">
            <Button as={Link} to="/list-your-property" size="lg">{t("heroUploadCta")}</Button>
          </div>
          <div className="mt-8">
            <SearchBar
              variant="heroWalde"
              showListingMode={false}
              onOpenMoreFilters={() => setMoreFiltersOpen(true)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("popularSearches")}>
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.labelKey}
                type="button"
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
                onClick={() => applyQuickFilter(f.params)}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </Container>
      </section>
      <HomeMoreFiltersModal open={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} />
      <RecommendationsSection />
      <Section className="pt-0">
        <Container>
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-accent">{t("properties")}</p>
              <h2 className="mt-1 text-2xl font-semibold text-heading">
                {loading ? t("loadingListings") : `${data.total || 0} ${t("listingsCount")}`}
              </h2>
            </div>
            <label className="flex items-center gap-2">
              <span className="text-sm text-muted">{t("sort")}</span>
              <Select
                className="w-auto min-w-[160px]"
                value={sort}
                onChange={(e) => onChangeParam("sort", e.target.value)}
                disabled={loading}
                aria-label={t("sort")}
              >
                <option value="ranked">{t("sortRecommended")}</option>
                <option value="latest">{t("sortLatest")}</option>
                <option value="price_asc">{t("sortPriceAsc")}</option>
                <option value="price_desc">{t("sortPriceDesc")}</option>
                <option value="size_desc">{t("sortSize")}</option>
              </Select>
            </label>
          </header>

          <p className="mb-6 text-sm text-muted">
            {t("showingPerPage", { n: PAGE_SIZE })}{pageSubtitle}
          </p>

          {loading ? <p className="text-muted">{t("loadingListings")}</p> : null}

          {!loading && data.properties.length > 0 ? (
            <ListingErrorBoundary>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {data.properties.map((property) => (
                  <PropertyCard key={property.property_id} property={property} variant="home" />
                ))}
              </div>
            </ListingErrorBoundary>
          ) : null}

          {!loading && data.properties.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-soft">
              <h3 className="text-lg font-semibold text-heading">{t("noListingsTitle")}</h3>
              <p className="mt-2 text-muted">{t("noListingsBody")}</p>
            </div>
          ) : null}

          <div className="mt-8">
            <Pagination
              variant="walde"
              page={data.page || 1}
              totalPages={data.totalPages || 1}
              onChange={(p) => onChangeParam("page", String(p))}
            />
          </div>
        </Container>
      </Section>
    </main>
  );
}

export default HomePage;
