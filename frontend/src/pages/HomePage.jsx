import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";

function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api
      .get("/properties", { params: { page: 1, limit: 5000, sort: "latest" } })
      .then((r) => setFeatured(r.data.properties || []))
      .catch(() => {});
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="container">
          <span className="hero-pill">Trusted Property Aggregator for Addis Ababa</span>
          <h1>Find your next home in Addis Ababa</h1>
          <p>
            Explore high-quality rental and sale listings with clear prices, large photos and neighborhood context.
          </p>
          <div className="hero-cta-row">
            <Link className="button hero-contact-cta" to="/contact">Contact Us</Link>
            <Link className="button hero-upload-cta" to="/list-your-property">Upload your listing</Link>
          </div>
          <SearchBar />
        </div>
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
