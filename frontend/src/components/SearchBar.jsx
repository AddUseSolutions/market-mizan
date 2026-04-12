import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { uniqueSortedAreas } from "../utils/areaOptions";

function SearchBar({ compact = false }) {
  const [search, setSearch] = useState("");
  const [property_type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [area, setArea] = useState("");
  const [options, setOptions] = useState({ areas: [] });
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/filters/options").then((r) => setOptions(r.data)).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (property_type) params.set("property_type", property_type);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (area) params.set("area", area);
    const q = params.toString();
    navigate(q ? `/search?${q}` : "/search");
  };

  const areaChoices = uniqueSortedAreas(options.areas || []);

  return (
    <form className={`searchbar ${compact ? "compact" : ""}`} onSubmit={submit}>
      <input placeholder="Search by area or keyword" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={property_type} onChange={(e) => setType(e.target.value)}>
        <option value="">Type</option>
        <option value="Apartment for sale">Apartment for sale</option>
        <option value="House for sale">House for sale</option>
      </select>
      <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
        <option value="">Area</option>
        {areaChoices.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
        <option value="">Bedrooms</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
      </select>
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchBar;
