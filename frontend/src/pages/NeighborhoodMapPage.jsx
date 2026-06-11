import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import api from "../api";

function formatUsd(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `$${Math.round(Number(value)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function NeighborhoodMapPage() {
  const [stats, setStats] = useState({ rent: [], sale: [], minSampleSize: 3 });
  const [listingType, setListingType] = useState("rent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/neighborhoods")
      .then((r) => {
        const data = r.data || {};
        setStats({
          rent: Array.isArray(data.rent) ? data.rent : [],
          sale: Array.isArray(data.sale) ? data.sale : [],
          minSampleSize: data.minSampleSize ?? 3
        });
      })
      .catch(() => setStats({ rent: [], sale: [], minSampleSize: 3 }))
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(
    () => (listingType === "sale" ? stats.sale : stats.rent),
    [listingType, stats.rent, stats.sale]
  );

  const subtitle =
    listingType === "sale"
      ? "Median purchase price per m² by area (min. 3 active sale listings per woreda)."
      : "Median rent per m² by area (min. 3 active rental listings per woreda).";

  return (
    <main className="page-walde">
      <div className="container section-space">
        <h1>Neighborhood price map</h1>
        <p className="detail-subtitle">{subtitle}</p>

        <div className="neighborhood-type-toggle" role="tablist" aria-label="Listing type">
          <button
            type="button"
            role="tab"
            aria-selected={listingType === "rent"}
            className={`listing-mode-btn${listingType === "rent" ? " listing-mode-btn-active" : ""}`}
            onClick={() => setListingType("rent")}
          >
            Rent
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listingType === "sale"}
            className={`listing-mode-btn${listingType === "sale" ? " listing-mode-btn-active" : ""}`}
            onClick={() => setListingType("sale")}
          >
            Sale
          </button>
        </div>

        {loading ? <p>Loading map…</p> : null}
        {!loading && areas.length === 0 ? (
          <p className="muted-inline">
            No areas with at least {stats.minSampleSize} active {listingType} listings yet.
          </p>
        ) : null}

        <div className="neighborhood-map-wrap">
          <MapContainer center={[8.98, 38.76]} zoom={12} className="neighborhood-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {areas.map((a) =>
              a.lat && a.lng ? (
                <CircleMarker
                  key={`${listingType}-${a.area}`}
                  center={[Number(a.lat), Number(a.lng)]}
                  radius={8 + Math.min(Number(a.listing_count) || 0, 20)}
                >
                  <Popup>
                    <strong>{a.area}</strong>
                    <br />
                    {listingType === "sale" ? "For sale" : "For rent"}
                    <br />
                    {a.listing_count} listings<br />
                    Avg {formatUsd(a.avg_price_usd)}
                    {listingType === "rent" ? " / monthly rent" : ""}
                    <br />
                    Median {formatUsd(a.median_pps_usd)}/m²
                  </Popup>
                </CircleMarker>
              ) : null
            )}
          </MapContainer>
        </div>

        <table className="table neighborhood-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Listings</th>
              <th>Avg USD{listingType === "rent" ? " / monthly rent" : ""}</th>
              <th>Median $/m²</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={`${listingType}-${a.area}`}>
                <td>{a.area}</td>
                <td>{a.listing_count}</td>
                <td>
                  {formatUsd(a.avg_price_usd)}
                  {listingType === "rent" ? " / monthly rent" : ""}
                </td>
                <td>{formatUsd(a.median_pps_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
