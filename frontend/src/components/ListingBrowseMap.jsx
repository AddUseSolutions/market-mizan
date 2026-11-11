import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MapListingThumb from "./MapListingThumb";
import { loadGoogleMaps } from "../utils/googleMapsLoader";
import { clusterPins, formatPinPrice } from "../utils/listingMapPins";
import { getPriceLines } from "../utils/pricing";

/** Map marker palette from brand feedback: fill #0000FF, ring #002060. */
const MAP_FILL = "#0000FF";
const MAP_RING = "#002060";
const MAP_BLUE = MAP_FILL;

function markerIcon(maps, label, active) {
  const fill = active ? MAP_BLUE : "#ffffff";
  const color = active ? "#ffffff" : MAP_BLUE;
  // No showable price → speech bubble ("ask for price"), not "?" or a dash.
  if (label == null || label === "") {
    const size = 28;
    // Bubble + dots optically centered in the circle (body slightly above mid so the tail balances).
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12.25" fill="${fill}" stroke="${MAP_RING}" stroke-width="2"/><path d="M9 8.1h10a3.2 3.2 0 0 1 3.2 3.2v3.3a3.2 3.2 0 0 1-3.2 3.2h-2.55L14 20.3l-2.45-2.5H9A3.2 3.2 0 0 1 5.8 14.6v-3.3A3.2 3.2 0 0 1 9 8.1z" fill="none" stroke="${color}" stroke-width="1.65" stroke-linejoin="round"/><circle cx="10.9" cy="12.85" r="0.95" fill="${color}"/><circle cx="14" cy="12.85" r="0.95" fill="${color}"/><circle cx="17.1" cy="12.85" r="0.95" fill="${color}"/></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new maps.Size(size, size),
      anchor: new maps.Point(size / 2, size / 2)
    };
  }
  const text = String(label).replace(/[<>&]/g, "").slice(0, 12);
  const width = Math.max(54, text.length * 7 + 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28"><rect x="0.75" y="0.75" width="${width - 1.5}" height="26.5" rx="13" fill="${fill}" stroke="${MAP_RING}" stroke-width="2"/><text x="${width / 2}" y="18" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${color}">${text}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(width, 28),
    anchor: new maps.Point(width / 2, 14)
  };
}

function clusterIcon(maps, count) {
  const size = count >= 100 ? 48 : 40;
  const r = size / 2 - 1;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${MAP_FILL}" stroke="${MAP_RING}" stroke-width="3"/><text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#ffffff">${count}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(size, size),
    anchor: new maps.Point(size / 2, size / 2)
  };
}

function sameView(prev, next) {
  if (!prev) return false;
  return prev.zoom === next.zoom && prev.south === next.south && prev.north === next.north && prev.west === next.west && prev.east === next.east;
}

export default function ListingBrowseMap({ pins, selectedId, onSelect, onView }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const markersRef = useRef([]);
  const fittedRef = useRef("");
  const skipMapClick = useRef(false);
  const onSelectRef = useRef(onSelect);
  const onViewRef = useRef(onView);
  onSelectRef.current = onSelect;
  onViewRef.current = onView;
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [view, setView] = useState({ zoom: 12, south: null, north: null, west: null, east: null });

  useEffect(() => {
    let cancelled = false;
    let idleListener = null;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return;
        mapsRef.current = maps;
        if (!mapRef.current) {
          mapRef.current = new maps.Map(hostRef.current, {
            center: { lat: 9.01, lng: 38.76 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false
          });
          mapRef.current.addListener("click", () => {
            if (skipMapClick.current) {
              skipMapClick.current = false;
              return;
            }
            onSelectRef.current("");
          });
        }
        idleListener = mapRef.current.addListener("idle", () => {
          const map = mapRef.current;
          const bounds = map.getBounds();
          if (!bounds) return;
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          const next = {
            zoom: map.getZoom() || 12,
            south: Number(southWest.lat().toFixed(5)),
            north: Number(northEast.lat().toFixed(5)),
            west: Number(southWest.lng().toFixed(5)),
            east: Number(northEast.lng().toFixed(5))
          };
          setView((prev) => (sameView(prev, next) ? prev : next));
          onViewRef.current?.(next);
        });
        setMapReady(true);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Google Maps is not available in this browser yet.");
      });
    return () => {
      cancelled = true;
      if (idleListener) idleListener.remove();
    };
  }, []);

  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map) return undefined;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    const bounds = view.south == null ? null : view;
    const items = clusterPins(pins, { zoom: view.zoom, bounds, selectedId });
    const fit = new maps.LatLngBounds();
    for (const item of items) {
      const marker = new maps.Marker({
        map,
        position: { lat: item.lat, lng: item.lng },
        icon: item.type === "cluster" ? clusterIcon(maps, item.count) : markerIcon(maps, formatPinPrice(item.pin), item.pin.property_id === selectedId),
        title:
          item.type === "cluster"
            ? `${item.count} homes`
            : formatPinPrice(item.pin) == null
              ? `${item.pin.title || "Home"} · Price on request`
              : item.pin.title,
        zIndex: item.type === "pin" && item.pin.property_id === selectedId ? 1000 : undefined
      });
      if (item.type === "cluster") {
        marker.addListener("click", () => {
          skipMapClick.current = true;
          map.panTo({ lat: item.lat, lng: item.lng });
          map.setZoom(Math.min((map.getZoom() || 12) + 2, 16));
        });
      } else {
        marker.addListener("click", () => {
          skipMapClick.current = true;
          onSelectRef.current(item.pin.property_id);
        });
      }
      markersRef.current.push(marker);
      fit.extend({ lat: item.lat, lng: item.lng });
    }
    const pinKey = pins.map((pin) => pin.property_id).join(",");
    if (pinKey && fittedRef.current !== pinKey && !fit.isEmpty()) {
      fittedRef.current = pinKey;
      map.fitBounds(fit, 48);
    }
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };
  }, [pins, selectedId, view, mapReady]);

  const selected = pins.find((pin) => pin.property_id === selectedId) || null;
  const price = selected ? getPriceLines(selected) : null;

  return (
    <div className="relative h-[420px] overflow-hidden rounded-xl border border-line lg:h-[calc(100vh-220px)] lg:min-h-[520px]">
      {error ? (
        <div className="flex h-full items-center justify-center px-6 text-sm text-muted">{error}</div>
      ) : (
        <div ref={hostRef} className="h-full w-full" />
      )}
      {selected ? (
        <Link
          to={`/property/${encodeURIComponent(selected.property_id)}`}
          className="absolute bottom-3 left-3 right-3 z-10 flex gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card sm:right-auto sm:w-80"
        >
          <MapListingThumb images={selected.images} />
          <span className="min-w-0">
            <span className="line-clamp-2 text-sm font-semibold text-heading">{selected.title}</span>
            <span className="mt-1 block text-sm text-brand-deep">
              {price?.onRequest ? "Price on request" : price?.usd || price?.etb}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {selected.approximate ? `Around ${selected.location_area || selected.area || "Addis Ababa"}` : selected.location_area || selected.area}
            </span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}
