import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";
import FilterSidebar from "../components/FilterSidebar";
import { DEFAULT_CITY } from "../constants/location";
import Pagination from "../components/Pagination";
import PropertyCard from "../components/PropertyCard";
import { Container, Section, Select, Button, SectionHeader } from "../components/ui";

const PAGE_SIZE = 20;

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [options, setOptions] = useState({});
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("price_desc");

  const filters = {
    search: params.get("search") || "",
    listing_mode: params.get("listing_mode") || "",
    property_type: params.get("property_type") || "",
    bedrooms: params.get("bedrooms") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    city: DEFAULT_CITY,
    area: params.get("area") || params.get("district") || "",
    source: params.get("source") || "",
    page: Number(params.get("page") || 1),
    limit: PAGE_SIZE,
    sort
  };

  useEffect(() => {
    api
      .get("/filters/options")
      .then((r) =>
        setOptions({
          ...r.data,
          areas: uniqueSortedAreas(r.data.areas || [])
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get("/properties", { params: filters }).then((r) => setData(r.data)).catch(() => {});
  }, [params, sort]);

  const onChange = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };

  const onReset = () => setParams({});

  return (
    <Section>
      <Container className="flex flex-col gap-8 lg:flex-row">
        <FilterSidebar filters={filters} options={options} onChange={onChange} onReset={onReset} />
        <section className="flex-1">
          <SectionHeader
            eyebrow="Search"
            title={`${data.total} Results`}
            action={
              <div className="flex items-center gap-2">
                <Select className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="latest">Newest</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="size_desc">Size</option>
                </Select>
                <Button variant="secondary" size="sm" onClick={() => setView(view === "grid" ? "list" : "grid")}>
                  {view === "grid" ? "List view" : "Grid view"}
                </Button>
              </div>
            }
          />
          {data.properties.length > 0 ? (
            <div className={view === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4"}>
              {data.properties.map((property) => <PropertyCard key={property.property_id} property={property} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-soft">
              <h3 className="text-lg font-semibold text-heading">No results for current filters</h3>
              <p className="mt-2 text-muted">Reset filters or run a fresh scraper sync.</p>
            </div>
          )}
          <div className="mt-8">
            <Pagination page={data.page || 1} totalPages={data.totalPages || 1} onChange={(p) => onChange("page", String(p))} />
          </div>
        </section>
      </Container>
    </Section>
  );
}

export default SearchPage;
