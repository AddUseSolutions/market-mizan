import { useMemo } from "react";
import {
  buildGoogleMapsEmbedUrl,
  buildSafeMapQuery,
  getMapLocationCaption,
  resolvePropertyMapLocation
} from "../utils/mapLocation";
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

  return <GoogleMapEmbed src={embedSrc} caption={caption} />;
}

export default MapView;
