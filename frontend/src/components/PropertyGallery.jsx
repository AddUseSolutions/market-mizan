import { useState } from "react";

function PropertyGallery({ images = [] }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <img className="hero-image" src="https://via.placeholder.com/1200x700?text=Keine+Bilder" alt="Placeholder" />;
  }
  return (
    <div>
      <img className="hero-image" src={images[active]} alt={`Bild ${active + 1}`} />
      <div className="thumbs">
        {images.map((img, idx) => (
          <img key={img} src={img} onClick={() => setActive(idx)} className={active === idx ? "active" : ""} />
        ))}
      </div>
    </div>
  );
}

export default PropertyGallery;
