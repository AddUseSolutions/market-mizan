import { useState } from "react";

export default function CardImageCarousel({ images, emptyLabel = "No photo" }) {
  const list = (Array.isArray(images) ? images : []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const safeIndex = list.length ? index % list.length : 0;
  const current = list[safeIndex];

  function shift(delta, e) {
    e.stopPropagation();
    e.preventDefault();
    if (list.length <= 1) return;
    setIndex((i) => (i + delta + list.length) % list.length);
  }

  function goTo(i, e) {
    e.stopPropagation();
    e.preventDefault();
    setIndex(i);
  }

  if (!current) {
    return (
      <div className="card-media-placeholder" aria-hidden>
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="card-carousel" onClick={(e) => e.stopPropagation()}>
      <img
        src={current}
        alt=""
        loading="lazy"
        className="card-carousel-image"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement?.classList.add("card-carousel--broken");
        }}
      />
      {list.length > 1 ? (
        <>
          <button
            type="button"
            className="card-carousel-btn card-carousel-btn--prev"
            aria-label="Previous image"
            onClick={(e) => shift(-1, e)}
          >
            ‹
          </button>
          <button
            type="button"
            className="card-carousel-btn card-carousel-btn--next"
            aria-label="Next image"
            onClick={(e) => shift(1, e)}
          >
            ›
          </button>
          <div className="card-carousel-dots" aria-hidden>
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`card-carousel-dot${i === safeIndex ? " card-carousel-dot--active" : ""}`}
                aria-label={`Image ${i + 1}`}
                onClick={(e) => goTo(i, e)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
