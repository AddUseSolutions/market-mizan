import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import PropertyCard from "../components/PropertyCard";
import SearchBar from "../components/SearchBar";

function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api
      .get("/properties", { params: { page: 1, limit: 120, sort: "latest" } })
      .then((r) => setFeatured(r.data.properties || []))
      .catch(() => {});
  }, []);

  return (
    <main className="home-page">
      <section className="hero home-hero">
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
      <section className="home-listings">
        <div className="container section-space home-listings-inner">
          <header className="home-listings-header">
            <div>
              <p className="home-listings-eyebrow">Properties</p>
              <h2 className="home-listings-title">
                {featured.length ? `${featured.length} listings` : "Latest listings"}
              </h2>
            </div>
            <Link className="home-listings-link" to="/search">
              View all
            </Link>
          </header>
        {featured.length > 0 ? (
          <div className="home-listing-grid">
            {featured.map((property) => (
              <PropertyCard key={property.property_id} property={property} variant="home" />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No listings visible yet</h3>
            <p>Run the scraper from the Admin page or via `python run_scraper.py --limit 10`.</p>
          </div>
        )}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
