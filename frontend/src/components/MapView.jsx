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
  const latNum = Number(lat);
  const lngNum = Number(lng);
  let src = null;
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    src = `https://www.google.com/maps?q=${latNum},${lngNum}&z=14&output=embed`;
  } else {
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
