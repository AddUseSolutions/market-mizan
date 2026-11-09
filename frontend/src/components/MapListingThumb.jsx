import { useEffect, useState } from "react";
import { mediaVariant } from "../utils/propertyImages";
import { cn } from "../utils/cn";

const LOAD_TIMEOUT_MS = 8000;

/**
 * Map sidebar / popup thumb.
 * Placeholder stays visible until a photo loads — never show the browser broken-image icon.
 */
export default function MapListingThumb({ images, className = "h-20 w-24 shrink-0 rounded-xl" }) {
  const list = (Array.isArray(images) ? images : []).filter((url) => typeof url === "string" && url);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(list.length ? "loading" : "failed");
  const src = status !== "failed" && list[index] ? mediaVariant(list[index], "sm") : null;

  useEffect(() => {
    if (!src || status !== "loading") return undefined;
    const timer = window.setTimeout(() => {
      if (index + 1 < list.length) {
        setIndex((value) => value + 1);
        setStatus("loading");
      } else {
        setStatus("failed");
      }
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, status, index, list.length]);

  return (
    <span className={cn(className, "relative block overflow-hidden bg-line/40")} aria-hidden>
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-150",
            status === "ok" ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setStatus("ok")}
          onError={() => {
            if (index + 1 < list.length) {
              setIndex((value) => value + 1);
              setStatus("loading");
            } else {
              setStatus("failed");
            }
          }}
        />
      ) : null}
    </span>
  );
}
