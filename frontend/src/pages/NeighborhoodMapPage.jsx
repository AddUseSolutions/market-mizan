import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Container, Section } from "../components/ui";
import { cn } from "../utils/cn";

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

  const modeBtn = (active) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary border border-line"
    );

  const thClass = "border-b border-line px-3 py-2 text-left text-xs font-medium uppercase text-muted";
  const tdClass = "border-b border-line px-3 py-2 text-sm";

  return (
    <Section>
      <Container>
        <h1 className="text-3xl font-bold text-heading">Neighborhood price map</h1>
        <p className="mt-2 text-muted">{subtitle}</p>

        <div className="mt-6 inline-flex rounded-lg border border-line p-1" role="tablist" aria-label="Listing type">
          <button type="button" role="tab" aria-selected={listingType === "rent"} className={modeBtn(listingType === "rent")} onClick={() => setListingType("rent")}>Rent</button>
          <button type="button" role="tab" aria-selected={listingType === "sale"} className={modeBtn(listingType === "sale")} onClick={() => setListingType("sale")}>Sale</button>
        </div>

        {loading ? <p className="mt-4 text-muted">Loading map…</p> : null}
        {!loading && areas.length === 0 ? (
          <p className="mt-4 text-muted">No areas with at least {stats.minSampleSize} active {listingType} listings yet.</p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-line">
          <MapContainer center={[8.98, 38.76]} zoom={12} className="h-[400px] w-full z-0">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {areas.map((a) =>
              a.lat && a.lng ? (
                <CircleMarker key={`${listingType}-${a.area}`} center={[Number(a.lat), Number(a.lng)]} radius={8 + Math.min(Number(a.listing_count) || 0, 20)}>
                  <Popup>
                    <strong>{a.area}</strong><br />
                    {listingType === "sale" ? "For sale" : "For rent"}<br />
                    {a.listing_count} listings<br />
                    Avg {formatUsd(a.avg_price_usd)}{listingType === "rent" ? " / monthly rent" : ""}<br />
                    Median {formatUsd(a.median_pps_usd)}/m²
                  </Popup>
                </CircleMarker>
              ) : null
            )}
          </MapContainer>
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Area</th>
                <th className={thClass}>Listings</th>
                <th className={thClass}>Avg USD{listingType === "rent" ? " / monthly rent" : ""}</th>
                <th className={thClass}>Median $/m²</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={`${listingType}-${a.area}`}>
                  <td className={tdClass}>{a.area}</td>
                  <td className={tdClass}>{a.listing_count}</td>
                  <td className={tdClass}>{formatUsd(a.avg_price_usd)}{listingType === "rent" ? " / monthly rent" : ""}</td>
                  <td className={tdClass}>{formatUsd(a.median_pps_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
