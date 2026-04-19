import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";
import FilterSidebar from "../components/FilterSidebar";
import Pagination from "../components/Pagination";
import PropertyCard from "../components/PropertyCard";

const PAGE_SIZE = 20;

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ properties: [], total: 0, page: 1, totalPages: 1 });
  const [options, setOptions] = useState({});
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("latest");

  const filters = {
    search: params.get("search") || "",
    listing_mode: params.get("listing_mode") || "",
    property_type: params.get("property_type") || "",
    bedrooms: params.get("bedrooms") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    city: params.get("city") || "",
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
    <main className="container search-layout">
      <FilterSidebar filters={filters} options={options} onChange={onChange} onReset={onReset} />
      <section className="results-panel">
        <div className="row-between toolbar">
          <p>{data.total} Results</p>
          <div className="toolbar-actions">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="latest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="size_desc">Size</option>
            </select>
            <button onClick={() => setView(view === "grid" ? "list" : "grid")}>
              {view === "grid" ? "List view" : "Grid view"}
            </button>
          </div>
        </div>
        {data.properties.length > 0 ? (
          <div className={view === "grid" ? "grid" : "list"}>
            {data.properties.map((property) => <PropertyCard key={property.property_id} property={property} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No results for current filters</h3>
            <p>Reset filters or run a fresh scraper sync.</p>
          </div>
        )}
        <Pagination
          page={data.page || 1}
          totalPages={data.totalPages || 1}
          onChange={(p) => onChange("page", String(p))}
        />
      </section>
    </main>
  );
}

export default SearchPage;
