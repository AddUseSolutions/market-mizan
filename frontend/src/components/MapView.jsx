function toEmbedFromMapUrl(mapUrl) {
  if (!mapUrl || typeof mapUrl !== "string") return null;
  try {
    const parsed = new URL(mapUrl);
    const q = parsed.searchParams.get("q");
    if (q && q.trim()) {
      return `https://www.google.com/maps?q=${encodeURIComponent(q.trim())}&z=14&output=embed`;
    }
  } catch {
    return null;
  }
  return null;
}

function MapView({ lat, lng, mapUrl }) {
  // Important: `Number(null) === 0`, which would incorrectly render the map at (0,0).
  // Treat null/undefined/empty as "missing" and fall back to address embed.
  const latNum = lat === null || lat === undefined || lat === "" ? NaN : Number(lat);
  const lngNum = lng === null || lng === undefined || lng === "" ? NaN : Number(lng);
  let src = null;
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    // If both are exactly 0,0 it's almost certainly missing data.
    if (!(latNum === 0 && lngNum === 0)) {
      src = `https://www.google.com/maps?q=${latNum},${lngNum}&z=14&output=embed`;
    }
  } else {
    src = toEmbedFromMapUrl(mapUrl);
  }

  if (!src) {
    src = toEmbedFromMapUrl(mapUrl);
  }

  if (!src) {
    return <p>Keine Kartenkoordinaten verfügbar.</p>;
  }

  return (
    <iframe
      title="Google Map"
      src={src}
      width="100%"
      height="360"
      style={{ border: 0 }}
      loading="lazy"
      allowFullScreen
    />
  );
}

export default MapView;
