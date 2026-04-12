import { Link } from "react-router-dom";
import SourceBadge from "./SourceBadge";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function isNew(firstSeen) {
  if (!firstSeen) return false;
  return (new Date() - new Date(firstSeen)) / (1000 * 60 * 60) < 24;
}

function PropertyCard({ property }) {
  const image = asArray(property.images)[0];
  const title = property.title || "Property in Addis Ababa";
  return (
    <article className="card">
      <div className="card-media-wrap">
        <img src={image || "https://via.placeholder.com/640x400?text=Market+Mizan"} alt={title} />
        <div className="card-media-overlay" />
      </div>
      <div className="card-body">
        <div className="row-between">
          <SourceBadge source={property.source_name} />
          {isNew(property.first_seen) && <span className="new-badge">New</span>}
        </div>
        <h3>{title}</h3>
        <p className="price">{Number(property.price || 0).toLocaleString()} {property.currency || "ETB"}</p>
        <p className="card-meta">{property.bedrooms || 0} Beds · {property.bathrooms || 0} Baths · {property.property_size_m2 || "-"} m²</p>
        <p className="card-location">{property.location_area?.trim() || property.location_district || "Addis Ababa"}</p>
        <Link className="button card-button" to={`/property/${property.property_id}`}>View details</Link>
      </div>
    </article>
  );
}

export default PropertyCard;
