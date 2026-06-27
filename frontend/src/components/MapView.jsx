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

function MapView({ lat, lng, mapUrl, highlightQuery }) {
  const latNum = lat === null || lat === undefined || lat === "" ? NaN : Number(lat);
  const lngNum = lng === null || lng === undefined || lng === "" ? NaN : Number(lng);
  let src = null;
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    if (!(latNum === 0 && lngNum === 0)) {
      src = `https://www.google.com/maps?q=${latNum},${lngNum}&z=14&output=embed`;
    }
  } else {
    src = toEmbedFromMapUrl(mapUrl);
  }

  if (!src && highlightQuery) {
    src = `https://www.google.com/maps?q=${encodeURIComponent(highlightQuery)}&z=15&output=embed`;
  }

  if (!src) {
    src = toEmbedFromMapUrl(mapUrl);
  }

  if (!src) {
    return <p className="text-sm text-muted">No map coordinates available.</p>;
  }

  return (
    <iframe
      title="Google Map"
      src={src}
      className="h-[360px] w-full border-0"
      loading="lazy"
      allowFullScreen
    />
  );
}

export default MapView;
