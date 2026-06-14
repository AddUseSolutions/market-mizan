import { useState } from "react";
import { cn } from "../utils/cn";

function PropertyGallery({ images = [] }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <img
        className="h-[50vh] w-full object-cover sm:h-[60vh]"
        src="https://via.placeholder.com/1200x700?text=No+images"
        alt="Placeholder"
      />
    );
  }
  return (
    <div>
      <img
        className="h-[50vh] w-full object-cover sm:h-[60vh]"
        src={images[active]}
        alt={`Image ${active + 1}`}
      />
      <div className="flex gap-2 overflow-x-auto bg-surface/90 p-3">
        {images.map((img, idx) => (
          <button
            key={img}
            type="button"
            onClick={() => setActive(idx)}
            className={cn(
              "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
              active === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
            )}
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default PropertyGallery;
