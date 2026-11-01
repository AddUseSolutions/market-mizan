import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { Container, Section } from "../components/ui";
import { cn } from "../utils/cn";
import { loadGoogleMaps } from "../utils/googleMapsLoader";

function formatUsd(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `$${Math.round(Number(value)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function NeighborhoodGoogleMap({ areas, listingType }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const markers = [];
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(hostRef.current, {
            center: { lat: 9.03, lng: 38.74 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false
          });
        }
        const map = mapRef.current;
        const bounds = new maps.LatLngBounds();
        const info = new maps.InfoWindow();
        for (const area of areas) {
          const lat = Number(area.lat);
          const lng = Number(area.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const marker = new maps.Marker({
            map,
            position: { lat, lng },
            title: area.area
          });
          const rentLabel = listingType === "rent" ? " / monthly rent" : "";
          marker.addListener("click", () => {
            info.setContent(
              `<strong>${area.area}</strong><br>${listingType === "sale" ? "For sale" : "For rent"}<br>${area.listing_count} listings<br>Avg ${formatUsd(area.avg_price_usd)}${rentLabel}<br>Median ${formatUsd(area.median_pps_usd)}/m²`
            );
            info.open({ map, anchor: marker });
          });
          markers.push(marker);
          bounds.extend({ lat, lng });
        }
        if (!bounds.isEmpty()) map.fitBounds(bounds);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Google Maps is not configured yet. Add VITE_GOOGLE_MAPS_KEY and rebuild the site.");
      });
    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [areas, listingType]);

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-line bg-brand-muted/40 px-4 py-8 text-sm text-muted">
        <p>{error}</p>
        <a
          className="mt-2 inline-block font-semibold text-primary hover:underline"
          href="https://www.google.com/maps?q=Addis+Ababa"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Addis Ababa in Google Maps
        </a>
      </div>
    );
  }

  return <div ref={hostRef} className="mt-6 h-[400px] overflow-hidden rounded-xl border border-line" />;
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

        <NeighborhoodGoogleMap areas={areas} listingType={listingType} />

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
