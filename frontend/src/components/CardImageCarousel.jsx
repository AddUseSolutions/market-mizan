import { useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 48;

export default function CardImageCarousel({ images, emptyLabel = "No photo" }) {
  const list = (Array.isArray(images) ? images : []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0, active: false });
  const safeIndex = list.length ? index % list.length : 0;
  const current = list[safeIndex];

  function shift(delta, e) {
    e?.stopPropagation();
    e?.preventDefault();
    if (list.length <= 1) return;
    setIndex((i) => (i + delta + list.length) % list.length);
  }

  function goTo(i, e) {
    e?.stopPropagation();
    e?.preventDefault();
    setIndex(i);
  }

  function handleSwipe(dx, dy, e) {
    if (list.length <= 1) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    e?.stopPropagation();
    shift(dx < 0 ? 1 : -1, e);
  }

  function onTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    const t = e.changedTouches[0];
    handleSwipe(t.clientX - touchStart.current.x, t.clientY - touchStart.current.y, e);
  }

  function onPointerDown(e) {
    if (e.pointerType === "touch") return;
    pointerStart.current = { x: e.clientX, y: e.clientY, active: true };
  }

  function onPointerUp(e) {
    if (!pointerStart.current.active || e.pointerType === "touch") return;
    pointerStart.current.active = false;
    handleSwipe(e.clientX - pointerStart.current.x, e.clientY - pointerStart.current.y, e);
  }

  function onPointerLeave(e) {
    if (pointerStart.current.active) onPointerUp(e);
  }

  if (!current) {
    return (
      <div className="card-media-placeholder" aria-hidden>
        <span>{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div
      className="card-carousel card-carousel--navigable"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <img
        key={current}
        src={current}
        alt=""
        loading="lazy"
        draggable={false}
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
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M14.5 6 9 12l5.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="card-carousel-btn card-carousel-btn--next"
            aria-label="Next image"
            onClick={(e) => shift(1, e)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M9.5 6 15 12l-5.5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
