import { useLayoutEffect, useRef } from "react";

export default function CardPriceFitLine({ text, className, minPx = 7, maxPx = 16, bold = true }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !text) return;

    function fit() {
      const width = container.clientWidth;
      if (width <= 0) return;

      let lo = minPx;
      let hi = maxPx;
      let best = minPx;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        el.style.fontSize = `${mid}px`;
        if (el.scrollWidth <= width) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      el.style.fontSize = `${best}px`;
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text, minPx, maxPx]);

  if (!text) return null;

  return (
    <div ref={containerRef} className={className}>
      <span ref={textRef} className={`card-price-fit-text${bold ? " card-price-fit-text--bold" : ""}`}>
        {text}
      </span>
    </div>
  );
}
