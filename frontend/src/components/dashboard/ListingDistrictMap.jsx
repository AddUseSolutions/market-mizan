import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import subcities from "../../data/addisSubcities.json";
import { loadGoogleMaps } from "../../utils/googleMapsLoader";

const COLORS = {
  Bole: "#0B3D5C",
  Kirkos: "#1F7A4D",
  Arada: "#C2410C",
  Yeka: "#6D28D9",
  "Nifas Silk-Lafto": "#0E7490",
  Lideta: "#B45309",
  Gullele: "#BE185D",
  "Addis Ketema": "#1D4ED8",
  "Kolfe Keranio": "#047857",
  "Akaki Kaliti": "#7C2D12",
  "Lemi Kura": "#4B5563",
  Unassigned: "#6B7280"
};

const SHORT = {
  "Nifas Silk-Lafto": "Nifas Silk",
  "Addis Ketema": "Addis Ketema",
  "Kolfe Keranio": "Kolfe",
  "Akaki Kaliti": "Akaki"
};

function colorOf(area) {
  return COLORS[area] || "#6B7280";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatUsd(value) {
  if (value == null || !Number.isFinite(Number(value))) return "Price on request";
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

function countFor(district, mode) {
  if (!district) return 0;
  if (mode === "rent") return district.rent;
  if (mode === "sale") return district.sale;
  return district.total;
}

export default function ListingDistrictMap() {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const fittedRef = useRef(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("all");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/admin/listing-map")
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch(() => {
        if (!cancelled) setError("The city map could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byArea = useMemo(() => {
    const map = new Map();
    for (const district of data?.districts || []) map.set(district.area, district);
    return map;
  }, [data]);

  const pins = data?.pins || [];

  useEffect(() => {
    if (!data) return undefined;
    let cancelled = false;
    const polygons = [];
    const markers = [];
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(hostRef.current, {
            center: { lat: 9.01, lng: 38.76 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true
          });
        }
        const map = mapRef.current;
        const info = new maps.InfoWindow();
        const bounds = new maps.LatLngBounds();

        for (const district of subcities.districts) {
          const path = district.path.map(([lat, lng]) => ({ lat, lng }));
          const color = colorOf(district.name);
          const active = !selected || selected === district.name;
          const polygon = new maps.Polygon({
            paths: path,
            strokeColor: color,
            strokeOpacity: 1,
            strokeWeight: selected === district.name ? 3 : 1.5,
            fillColor: color,
            fillOpacity: active ? 0.32 : 0.08,
            map
          });
          path.forEach((point) => bounds.extend(point));
          const stats = byArea.get(district.name);
          polygon.addListener("click", (event) => {
            setSelected(district.name);
            const shown = countFor(stats, mode);
            info.setContent(
              `<strong>${escapeHtml(district.name)}</strong><br>${shown.toLocaleString("en-US")} ${mode === "all" ? "listings" : mode}<br>${Number(stats?.onMap || 0).toLocaleString("en-US")} with a map pin`
            );
            info.setPosition(event.latLng);
            info.open(map);
          });
          polygons.push(polygon);

          const lats = path.map((point) => point.lat);
          const lngs = path.map((point) => point.lng);
          const span = (Math.max(...lats) - Math.min(...lats)) * (Math.max(...lngs) - Math.min(...lngs));
          if (span > 0.002) {
            const lat = lats.reduce((sum, value) => sum + value, 0) / lats.length;
            const lng = lngs.reduce((sum, value) => sum + value, 0) / lngs.length;
            markers.push(
              new maps.Marker({
                position: { lat, lng },
                map,
                clickable: false,
                icon: { path: maps.SymbolPath.CIRCLE, scale: 0 },
                label: {
                  text: SHORT[district.name] || district.name,
                  color: "#102033",
                  fontSize: "11px",
                  fontWeight: "700"
                }
              })
            );
          }
        }

        for (const pin of pins) {
          if (mode !== "all" && pin.mode !== mode) continue;
          if (selected && pin.area !== selected) continue;
          const marker = new maps.Marker({
            position: { lat: pin.lat, lng: pin.lng },
            map,
            title: pin.title,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: pin.mode === "sale" ? "#C2410C" : pin.mode === "rent" ? "#0B3D5C" : "#6B7280",
              fillOpacity: 0.95,
              strokeColor: "#ffffff",
              strokeWeight: 1
            }
          });
          marker.addListener("click", () => {
            const href = `/property/${encodeURIComponent(pin.id)}`;
            info.setContent(
              `<strong>${escapeHtml(pin.title)}</strong><br>${escapeHtml(pin.area)} · ${escapeHtml(pin.mode)}<br>${escapeHtml(formatUsd(pin.priceUsd))}<br><a href="${href}">Open listing</a>`
            );
            info.open({ map, anchor: marker });
          });
          markers.push(marker);
        }

        if (!fittedRef.current && !bounds.isEmpty()) {
          map.fitBounds(bounds, 28);
          fittedRef.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) setError("Google Maps is not configured yet. Add VITE_GOOGLE_MAPS_KEY and rebuild the site.");
      });

    return () => {
      cancelled = true;
      polygons.forEach((polygon) => polygon.setMap(null));
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [data, pins, byArea, mode, selected]);

  const rows = data?.districts || [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "All"],
          ["rent", "For rent"],
          ["sale", "For sale"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              mode === value ? "bg-primary text-white" : "bg-brand-muted/50 text-heading"
            }`}
          >
            {label}
          </button>
        ))}
        {selected ? (
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => setSelected("")}>
            Show every district
          </button>
        ) : null}
        <span className="ml-auto text-xs text-muted">
          {data
            ? `${data.totals.onMap.toLocaleString("en-US")} pins · ${data.totals.total.toLocaleString("en-US")} listings on the site`
            : "Loading listings…"}
        </span>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div ref={hostRef} className="h-[70vh] min-h-[520px] overflow-hidden rounded-xl border border-line bg-brand-muted/30" />
        <aside className="max-h-[70vh] overflow-auto rounded-xl border border-line">
          <ul>
            {rows.map((district) => {
              const shown = countFor(district, mode);
              const active = selected === district.area;
              return (
                <li key={district.area}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? "" : district.area)}
                    className={`flex w-full items-start gap-2 border-b border-line px-3 py-2 text-left text-sm ${
                      active ? "bg-brand-muted/60" : "hover:bg-brand-muted/30"
                    }`}
                  >
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: colorOf(district.area) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-heading">{district.area}</span>
                      <span className="block text-xs text-muted">
                        {shown.toLocaleString("en-US")} {mode === "all" ? "listings" : mode}
                        {" · "}
                        {district.onMap.toLocaleString("en-US")} on the map
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <p className="mt-3 text-xs text-muted">
        District colours follow the 2016 Addis Ababa sub-city boundaries. Lemi Kura was created in 2020 from parts of Bole and Yeka, so its listings are counted in the list and its pins still appear, inside the older outline. Most crawled listings have no coordinates yet, so the pin is only the located share.{" "}
        <Link to="/neighborhoods" className="font-semibold text-primary">
          Public price map
        </Link>
      </p>
    </div>
  );
}
