function MapView({ lat, lng }) {
  if (!lat || !lng) return <p>Keine Kartenkoordinaten verfügbar.</p>;
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
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
