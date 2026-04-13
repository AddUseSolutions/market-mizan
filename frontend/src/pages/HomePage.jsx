import { useEffect, useState } from "react";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";

function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ total_active: 0, total_sources: 0 });

  useEffect(() => {
    api
      .get("/properties", { params: { page: 1, limit: 5000, sort: "latest" } })
      .then((r) => setFeatured(r.data.properties || []))
      .catch(() => {});
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="container">
          <span className="hero-pill">Trusted Property Aggregator for Addis Ababa</span>
          <h1>The largest real estate marketplace in Addis Ababa</h1>
          <p>Market Mizan aggregates property listings from multiple trusted sources in one place.</p>
          <SearchBar />
        </div>
      </section>
      <section className="container stats home-stats">
        <div>{stats.total_active} Active listings</div>
        <div>{stats.total_sources} Sources</div>
        <div>Updated daily</div>
      </section>
      <section className="container section-space">
        <h2>Latest listings</h2>
        {featured.length > 0 ? (
          <div className="grid">
            {featured.map((property) => <PropertyCard key={property.property_id} property={property} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No listings visible yet</h3>
            <p>Run the scraper from the Admin page or via `python run_scraper.py --limit 10`.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default HomePage;
