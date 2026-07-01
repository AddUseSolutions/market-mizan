import { useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import { buildSafeMapQuery, resolvePropertyMapLocation } from "../utils/mapLocation";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});
function FallbackMap({ query }) {
  if (!query) {
    return <p className="p-4 text-sm text-muted">No map coordinates available.</p>;
  }
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
  return (
    <iframe
      title="Google Map"
      src={src}
      className="h-[360px] w-full border-0"
      loading="lazy"
      allowFullScreen
    />
  );
}

function PropertyLeafletMap({ location, label }) {
  const center = [location.lat, location.lng];
  const zoom = location.mode === "point" ? 15 : 13;

  return (
    <MapContainer center={center} zoom={zoom} className="h-[360px] w-full z-0" scrollWheelZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
      {location.mode === "circle" ? (
        <Circle
          center={center}
          radius={location.radiusM}
          pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.2, weight: 2 }}
        >
          <Popup>
            <strong>{location.label || label}</strong>
            <br />
            Approximate area (no exact address)
          </Popup>
        </Circle>
      ) : (
        <Marker position={center}>
          <Popup>
            <strong>{location.label || label || "Property"}</strong>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

function MapView({ property }) {
  const resolved = useMemo(() => {
    if (!property) return { mode: "none" };
    return resolvePropertyMapLocation(property);
  }, [property]);

  const fallbackQuery = useMemo(() => {
    if (!property) return "";
    return buildSafeMapQuery(property);
  }, [property]);

  if (resolved.mode === "point" || resolved.mode === "circle") {
    return <PropertyLeafletMap location={resolved} label={property?.location_area} />;
  }

  return <FallbackMap query={fallbackQuery} />;
}

export default MapView;
