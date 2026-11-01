import { useEffect, useRef, useState } from "react";
import { ADDIS_DEFAULT_CENTER } from "../utils/mapLocation";
import { googleMapsKey, loadGoogleMaps } from "../utils/googleMapsLoader";

const MAP_HEIGHT = 320;

function finiteCoord(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function OsmPinPicker({ latitude, longitude, onChange, flyTo, areaLabel, className }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState(googleMapsKey() ? "" : "missing-key");

  onChangeRef.current = onChange;

  const lat = finiteCoord(latitude, ADDIS_DEFAULT_CENTER.lat);
  const lng = finiteCoord(longitude, ADDIS_DEFAULT_CENTER.lng);

  useEffect(() => {
    let cancelled = false;
    if (!googleMapsKey()) {
      setError("missing-key");
      return undefined;
    }
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current || mapRef.current) return;
        const center = { lat, lng };
        const map = new maps.Map(hostRef.current, {
          center,
          zoom: flyTo?.zoom ?? 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });
        const marker = new maps.Marker({ position: center, map, draggable: true });
        const emit = (pos) => {
          if (typeof onChangeRef.current !== "function" || !pos) return;
          onChangeRef.current({
            lat: Number(pos.lat().toFixed(7)),
            lng: Number(pos.lng().toFixed(7))
          });
        };
        marker.addListener("dragend", () => emit(marker.getPosition()));
        map.addListener("click", (event) => {
          if (!event.latLng) return;
          marker.setPosition(event.latLng);
          emit(event.latLng);
        });
        mapRef.current = map;
        markerRef.current = marker;
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("load-failed");
      });
    return () => {
      cancelled = true;
    };
    // Map is created once; later coordinate changes go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const next = { lat, lng };
    marker.setPosition(next);
    if (flyTo) map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    if (flyTo?.zoom) map.setZoom(flyTo.zoom);
  }, [lat, lng, flyTo?.lat, flyTo?.lng, flyTo?.zoom, flyTo?.token]);

  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}&z=16`;

  return (
    <div className={className}>
      <div ref={hostRef} className="w-full" style={{ height: MAP_HEIGHT, display: error ? "none" : "block" }} />
      {error ? (
        <div className="flex h-[320px] flex-col items-start justify-center gap-2 bg-brand-muted/40 px-4 text-sm text-muted">
          <p>
            {error === "missing-key"
              ? "Google Maps is not configured yet. Add VITE_GOOGLE_MAPS_KEY and rebuild the site."
              : "Google Maps could not be loaded."}
          </p>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Open this spot in Google Maps
          </a>
        </div>
      ) : null}
      {areaLabel ? (
        <p className="border-t border-line bg-brand-muted/20 px-3 py-2 text-xs text-muted">
          Map centered near <strong className="font-medium text-brand-deep">{areaLabel}</strong>. Click or drag the pin
          to refine the exact spot.
        </p>
      ) : null}
    </div>
  );
}
