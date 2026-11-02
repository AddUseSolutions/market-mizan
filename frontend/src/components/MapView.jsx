import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGoogleMapsEmbedUrl,
  buildSafeMapQuery,
  getMapLocationCaption,
  isInAddisBounds,
  resolvePropertyMapLocation
} from "../utils/mapLocation";
import { googleMapsKey, loadGoogleMaps } from "../utils/googleMapsLoader";
import { useLanguage } from "../context/LanguageContext";

function GoogleMapEmbed({ src, caption }) {
  if (!src) {
    return <p className="p-4 text-sm text-muted">No map coordinates available.</p>;
  }
  return (
    <div>
      <iframe
        title="Google Map"
        src={src}
        className="h-[360px] w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      {caption ? (
        <p className="border-t border-line bg-brand-muted/30 px-3 py-2 text-xs text-muted">{caption}</p>
      ) : null}
    </div>
  );
}

function PropertyPointMap({ lat, lng, zoom, caption, fallbackSrc }) {
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let marker;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !hostRef.current) return;
        const center = { lat, lng };
        const map = new maps.Map(hostRef.current, {
          center,
          zoom: zoom || 16,
          mapTypeControl: false,
          streetViewControl: false
        });
        marker = new maps.Marker({ map, position: center });
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      marker?.setMap(null);
    };
  }, [lat, lng, zoom]);

  if (failed) return <GoogleMapEmbed src={fallbackSrc} caption={caption} />;

  return (
    <div>
      <div ref={hostRef} className="h-[360px] w-full" />
      {caption ? (
        <p className="border-t border-line bg-brand-muted/30 px-3 py-2 text-xs text-muted">{caption}</p>
      ) : null}
    </div>
  );
}

function MapView({ property }) {
  const { t } = useLanguage();
  const resolved = useMemo(() => {
    if (!property) return { mode: "none" };
    return resolvePropertyMapLocation(property);
  }, [property]);

  const embedSrc = useMemo(() => {
    const fromResolved = buildGoogleMapsEmbedUrl(resolved);
    if (fromResolved) return fromResolved;
    const query = property ? buildSafeMapQuery(property) : "";
    if (!query) return null;
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`;
  }, [resolved, property]);

  const caption = useMemo(
    () => getMapLocationCaption(resolved, property, t),
    [resolved, property, t]
  );

  const point =
    resolved.mode === "point" &&
    googleMapsKey() &&
    isInAddisBounds(resolved.lat, resolved.lng);

  if (point) {
    return (
      <PropertyPointMap
        lat={Number(resolved.lat)}
        lng={Number(resolved.lng)}
        zoom={resolved.zoom}
        caption={caption}
        fallbackSrc={embedSrc}
      />
    );
  }

  return <GoogleMapEmbed src={embedSrc} caption={caption} />;
}

export default MapView;
