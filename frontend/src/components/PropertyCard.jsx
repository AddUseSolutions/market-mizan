import { useNavigate } from "react-router-dom";

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

function PropertyCard({ property, variant = "default" }) {
  const navigate = useNavigate();
  const image = asArray(property.images)[0];
  const title = property.title || "Property in Addis Ababa";
  const to = `/property/${property.property_id}`;
  const isHome = variant === "home";

  function openDetails() {
    navigate(to);
  }

  return (
    <article
      className={`card card-link${isHome ? " card--home" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`Open listing: ${title}`}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      }}
    >
      <div className="card-media-wrap">
        <img src={image || "https://via.placeholder.com/640x400?text=Market+Mizan"} alt="" />
        <div className="card-media-overlay" />
      </div>
      <div className="card-body">
        <div className="row-between">
          {isNew(property.first_seen) && <span className="new-badge">New</span>}
        </div>
        <h3>{title}</h3>
        <p className="price">{Number(property.price || 0).toLocaleString()} {property.currency || "ETB"}</p>
        <p className="card-meta">{property.bedrooms || 0} Beds · {property.bathrooms || 0} Baths · {property.property_size_m2 || "-"} m²</p>
        <p className="card-location">{property.location_area?.trim() || property.location_district || "Addis Ababa"}</p>
        {isHome ? (
          <div className="card-actions card-actions-home">
            <button
              type="button"
              className="button card-button card-button-home-primary"
              onClick={(e) => {
                e.stopPropagation();
                openDetails();
              }}
            >
              View details
            </button>
          </div>
        ) : (
          <div className="card-actions">
            <button
              type="button"
              className="button card-button card-button-pseudo"
              onClick={(e) => {
                e.stopPropagation();
                openDetails();
              }}
            >
              View details
            </button>
            <button
              type="button"
              className="button card-button card-button-contact"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/contact?property_id=${encodeURIComponent(property.property_id)}&title=${encodeURIComponent(title)}`);
              }}
            >
              Contact Us
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default PropertyCard;
