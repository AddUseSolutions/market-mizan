import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import MapView from "../components/MapView";
import PropertyCard from "../components/PropertyCard";
import PropertyGallery from "../components/PropertyGallery";

function ensureArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return [];
}

function formatSyncedAt(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function SpecRow({ label, value, empty = "—" }) {
  const display = value === null || value === undefined || value === "" ? empty : value;
  return (
    <div className="detail-spec-row">
      <dt className="detail-spec-label">{label}</dt>
      <dd className="detail-spec-value">{display}</dd>
    </div>
  );
}

function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    api.get(`/properties/${id}`).then((r) => {
      const p = { ...r.data, images: ensureArray(r.data.images), features: ensureArray(r.data.features) };
      setProperty(p);
      const sim = { limit: 4 };
      if (p.location_area) sim.area = String(p.location_area).trim();
      return api.get("/properties", { params: sim });
    }).then((r) => setSimilar(r.data.properties || [])).catch(() => {});
  }, [id]);

  if (!property) return <main className="container"><p>Loading property…</p></main>;

  const synced = formatSyncedAt(property.scraped_at);
  const priceStr = `${Number(property.price || 0).toLocaleString()} ${property.currency || "ETB"}`;
  const district = property.location_district?.trim();
  const area = property.location_area?.trim();
  const city = property.location_city?.trim() || "Addis Ababa";
  const districtLower = (district || "").toLowerCase();

  const addressParts = [];
  if (district) addressParts.push(district);
  if (area && !districtLower.includes(area.toLowerCase())) addressParts.push(area);
  if (city && !districtLower.includes(city.toLowerCase())) addressParts.push(city);

  const fullAddress = addressParts.join(", ") || city;

  return (
    <main className="container section-space">
      <PropertyGallery images={property.images} />
      <div className="detail-hero">
        <div>
          <h1 className="detail-title">{property.title}</h1>
          <p className="price">{priceStr}</p>
          <p className="detail-subtitle">{fullAddress} · {property.property_type || "Property"}</p>
        </div>
        <a className="button detail-cta" href={property.detail_url} target="_blank" rel="noreferrer">View original listing</a>
      </div>

      <div className="detail-meta-bar">
        <p className="detail-meta-item">
          <span className="detail-meta-key">Listing details updated (RealEthio)</span>
          <span className="detail-meta-val">
            {property.source_listing_updated
              ? property.source_listing_updated
              : "Not available — run the scraper once so we can store the “Updated on …” line from the listing."}
          </span>
        </p>
        <p className="detail-meta-item">
          <span className="detail-meta-key">Last synced to Market Mizan</span>
          <span className="detail-meta-val">{synced || "—"}</span>
        </p>
      </div>

      <div className="quick-facts">
        <span>{property.bedrooms ?? "—"} Beds</span>
        <span>{property.bathrooms ?? "—"} Baths</span>
        <span>{property.property_size_m2 ?? "—"} m²</span>
        <span>{property.furnished ? "Furnished" : "Unfurnished"}</span>
      </div>

      <div className="details-grid">
        <div className="panel detail-specs-panel">
          <h3 className="detail-section-title">Property details</h3>
          <dl className="detail-specs">
            <SpecRow label="Property ID" value={property.property_id} />
            <SpecRow label="Listing updated (source site)" value={property.source_listing_updated} />
            <SpecRow label="Price" value={priceStr} />
            <SpecRow label="Bedrooms" value={property.bedrooms} />
            <SpecRow label="Bathrooms" value={property.bathrooms} />
            <SpecRow label="Property Size" value={property.property_size_m2 != null ? `${property.property_size_m2} m²` : null} />
            <SpecRow label="Land area" value={property.land_area_m2 != null ? `${property.land_area_m2} m²` : null} />
            <SpecRow label="Garage spaces" value={property.garage} />
            <SpecRow label="Floor" value={property.floor} />
            <SpecRow label="Type" value={property.property_type} />
            <SpecRow label="Status" value={property.property_status} />
            <div className="detail-spec-row">
              <dt className="detail-spec-label">
                <strong id="area-label">Area:</strong>
              </dt>
              <dd className="detail-spec-value">{property.location_area?.trim() || "—"}</dd>
            </div>
            <SpecRow label="Address" value={property.location_district} />
            <SpecRow label="City" value={property.location_city || "Addis Ababa"} />
            <SpecRow label="Furnished" value={property.furnished ? "Yes" : "No"} />
          </dl>
        </div>
        <div className="panel">
          <h3 className="detail-section-title">Features</h3>
          <div className="feature-list">
            {property.features.length ? property.features.map((f) => <span key={f} className="feature">{f}</span>) : <p className="muted-inline">No features listed.</p>}
          </div>
        </div>
      </div>
      <p className="detail-description">{property.description}</p>
      <MapView lat={property.latitude} lng={property.longitude} />
      <h2>Similar listings</h2>
      <div className="grid">
        {similar.filter((x) => x.property_id !== property.property_id).slice(0, 3).map((item) => (
          <PropertyCard key={item.property_id} property={item} />
        ))}
      </div>
      <p><Link to="/search">Back to search</Link></p>
    </main>
  );
}

export default PropertyDetailPage;
