import { useLayoutEffect, useRef, useState } from "react";

export default function CardPriceFitLine({
  text,
  className,
  minPx = 10,
  maxPx = 22,
  bold = true,
  compactText = null
}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [line, setLine] = useState(text);

  useLayoutEffect(() => {
    setLine(text);
  }, [text]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el || !text) return;

    function applyFit(value) {
      const width = container.clientWidth;
      if (width <= 0) return false;

      el.textContent = value;
      el.style.display = "inline-block";
      el.style.whiteSpace = "nowrap";
      el.style.transform = "none";
      el.style.transformOrigin = "left center";
      el.style.letterSpacing = "-0.02em";
      el.style.fontVariantNumeric = "tabular-nums";

      let best = minPx;
      let lo = minPx;
      let hi = maxPx;

      while (lo <= hi) {
        const mid = Math.round((lo + hi) * 4) / 4;
        el.style.fontSize = `${mid}px`;
        if (el.getBoundingClientRect().width <= width + 0.5) {
          best = mid;
          lo = mid + 0.25;
        } else {
          hi = mid - 0.25;
        }
      }

      el.style.fontSize = `${best}px`;
      let fittedWidth = el.getBoundingClientRect().width;

      if (fittedWidth > width + 0.5) {
        const scale = Math.max(0.78, width / fittedWidth);
        el.style.transform = `scaleX(${scale})`;
        fittedWidth *= scale;
      }

      return fittedWidth <= width + 0.5;
    }

    function run() {
      const fitsFull = applyFit(text);
      if (fitsFull || !compactText) {
        setLine(text);
        applyFit(text);
        return;
      }

      setLine(compactText);
      applyFit(compactText);
    }

    run();

    const observer = new ResizeObserver(run);
    observer.observe(container);
    window.addEventListener("orientationchange", run);
    document.fonts?.ready?.then(run).catch(() => {});

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", run);
    };
  }, [text, compactText, minPx, maxPx]);

  if (!text) return null;

  return (
    <div ref={containerRef} className={className}>
      <span ref={textRef} className={`card-price-fit-text${bold ? " card-price-fit-text--bold" : ""}`}>
        {line}
      </span>
    </div>
  );
}
