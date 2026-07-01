import { useMemo } from "react";
import {
  buildGoogleMapsEmbedUrl,
  buildSafeMapQuery,
  resolvePropertyMapLocation
} from "../utils/mapLocation";

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

function MapView({ property }) {
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

  const caption = useMemo(() => {
    if (resolved.mode === "point") return null;
    if (resolved.mode === "place" && resolved.label) {
      return `Approximate area: ${resolved.label}, Addis Ababa (Google Maps)`;
    }
    return null;
  }, [resolved]);

  return <GoogleMapEmbed src={embedSrc} caption={caption} />;
}

export default MapView;
