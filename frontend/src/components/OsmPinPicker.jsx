import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ADDIS_DEFAULT_CENTER } from "../utils/mapLocation";

const MAP_HEIGHT = 320;
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PIN_ICON = L.divIcon({
  className: "osm-pin-marker",
  html: '<span class="osm-pin-marker-dot" aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapFlyTo({ target, zoom = 14 }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? zoom, { duration: 0.55 });
  }, [map, target?.lat, target?.lng, target?.zoom, target?.token, zoom]);

  return null;
}

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function DraggablePin({ position, onChange }) {
  return (
    <Marker
      position={position}
      icon={PIN_ICON}
      draggable
      eventHandlers={{
        dragend(event) {
          const { lat, lng } = event.target.getLatLng();
          onChange({ lat, lng });
        },
      }}
    />
  );
}

export default function OsmPinPicker({
  latitude,
  longitude,
  onChange,
  flyTo,
  areaLabel,
  className,
}) {
  const position = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return [
      Number.isFinite(lat) ? lat : ADDIS_DEFAULT_CENTER.lat,
      Number.isFinite(lng) ? lng : ADDIS_DEFAULT_CENTER.lng,
    ];
  }, [latitude, longitude]);

  const handleChange = (pos) => {
    if (typeof onChange !== "function") return;
    onChange({
      lat: Number(pos.lat.toFixed(7)),
      lng: Number(pos.lng.toFixed(7)),
    });
  };

  return (
    <div className={className}>
      <MapContainer
        center={position}
        zoom={flyTo?.zoom ?? 14}
        className="z-0 w-full"
        style={{ height: MAP_HEIGHT }}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {flyTo ? <MapFlyTo target={flyTo} /> : null}
        <MapClickHandler onChange={handleChange} />
        <DraggablePin position={position} onChange={handleChange} />
      </MapContainer>
      {areaLabel ? (
        <p className="border-t border-line bg-brand-muted/20 px-3 py-2 text-xs text-muted">
          Map centered near <strong className="font-medium text-brand-deep">{areaLabel}</strong>.
          Click or drag the pin to refine the exact spot.
        </p>
      ) : null}
    </div>
  );
}
