import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import api from "../api";

export default function NeighborhoodMapPage() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/neighborhoods").then((r) => setAreas(r.data || [])).catch(() => setAreas([])).finally(() => setLoading(false));
  }, []);

  return (
    <main className="page-walde">
      <div className="container section-space">
        <h1>Neighborhood price map</h1>
        <p className="detail-subtitle">Average prices and median price per m² by area in Addis Ababa.</p>
        {loading ? <p>Loading map…</p> : null}
        <div className="neighborhood-map-wrap">
          <MapContainer center={[8.98, 38.76]} zoom={12} className="neighborhood-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {areas.map((a) => (
              a.lat && a.lng ? (
                <CircleMarker key={a.area} center={[Number(a.lat), Number(a.lng)]} radius={8 + Math.min(Number(a.listing_count) || 0, 20)}>
                  <Popup>
                    <strong>{a.area}</strong><br />
                    {a.listing_count} listings<br />
                    Avg ${Number(a.avg_price_usd || 0).toLocaleString("en-US")}<br />
                    ~${Number(a.median_pps_usd || 0).toLocaleString("en-US")}/m²
                  </Popup>
                </CircleMarker>
              ) : null
            ))}
          </MapContainer>
        </div>
        <table className="table neighborhood-table">
          <thead>
            <tr><th>Area</th><th>Listings</th><th>Avg USD</th><th>Median $/m²</th></tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.area}>
                <td>{a.area}</td>
                <td>{a.listing_count}</td>
                <td>${Number(a.avg_price_usd || 0).toLocaleString("en-US")}</td>
                <td>${Number(a.median_pps_usd || 0).toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
