function MapView({ lat, lng }) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return <p>Keine Kartenkoordinaten verfügbar.</p>;
  }
  const src = `https://www.google.com/maps?q=${latNum},${lngNum}&z=14&output=embed`;
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
