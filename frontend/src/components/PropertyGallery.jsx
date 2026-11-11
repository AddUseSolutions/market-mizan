import { useEffect, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { mediaVariant, parsePropertyImages } from "../utils/propertyImages";

function IconDocument({ className = "", size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 4v4h4M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconHome({ className = "", size = 36 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GalleryPlaceholder({ label = "No photo" }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-line/35 text-muted">
      <IconHome className="opacity-45" size={40} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function PropertyGallery({
  propertyId,
  images = [],
  statusLabel,
  sourceLabel,
  sourcePrefix = "Source:",
  sourceUrl = null,
  emptyLabel = "No photo",
}) {
  const list = useMemo(() => parsePropertyImages(images), [images]);
  const [failed, setFailed] = useState(() => new Set());
  const [activeUrl, setActiveUrl] = useState(() => list[0] || null);

  useEffect(() => {
    setFailed(new Set());
    setActiveUrl(list[0] || null);
  }, [propertyId, list]);

  const working = useMemo(() => list.filter((url) => !failed.has(url)), [list, failed]);

  // Never show "No photo" while another URL in the gallery still might load.
  useEffect(() => {
    if (!working.length) {
      if (activeUrl != null) setActiveUrl(null);
      return;
    }
    if (!activeUrl || failed.has(activeUrl)) {
      setActiveUrl(working[0]);
    }
  }, [working, activeUrl, failed]);

  const showMain = Boolean(activeUrl && !failed.has(activeUrl));
  const thumbCols = working.length <= 1 ? 1 : working.length === 2 ? 2 : 3;

  function markFailed(url) {
    if (!url) return;
    setFailed((prev) => {
      if (prev.has(url)) return prev;
      return new Set(prev).add(url);
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-line/30">
        {showMain ? (
          <img
            key={`${propertyId}-${activeUrl}`}
            className="h-full w-full object-cover"
            src={activeUrl}
            alt="Listing photo"
            referrerPolicy="no-referrer"
            onError={() => markFailed(activeUrl)}
          />
        ) : working.length ? (
          <div className="h-full w-full animate-pulse bg-line/40" aria-hidden />
        ) : (
          <GalleryPlaceholder label={emptyLabel} />
        )}

        {statusLabel ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {statusLabel}
          </span>
        ) : null}
      </div>

      {working.length > 1 ? (
        <div
          className={cn(
            "gap-2",
            working.length <= 4 ? "grid" : "flex overflow-x-auto pb-1",
            working.length <= 4 && thumbCols === 1 && "grid-cols-1",
            working.length <= 4 && thumbCols === 2 && "grid-cols-2",
            working.length <= 4 && thumbCols === 3 && "grid-cols-3"
          )}
        >
          {working.map((img, idx) => (
            <button
              key={img}
              type="button"
              onClick={() => setActiveUrl(img)}
              aria-label={`View image ${idx + 1}`}
              aria-current={activeUrl === img ? "true" : undefined}
              className={cn(
                "h-20 shrink-0 overflow-hidden rounded-xl transition-all sm:h-24",
                working.length > 4 && "w-28 sm:w-32",
                activeUrl === img ? "ring-2 ring-primary ring-offset-1" : "opacity-75 hover:opacity-100"
              )}
            >
              <img
                src={mediaVariant(img, "sm")}
                alt=""
                loading={activeUrl === img ? "eager" : "lazy"}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={() => markFailed(img)}
              />
            </button>
          ))}
        </div>
      ) : null}

      {sourceLabel ? (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <IconDocument className="shrink-0 text-primary" />
          <span>
            {sourcePrefix}{" "}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                {sourceLabel}
              </a>
            ) : (
              <span className="font-medium text-text">{sourceLabel}</span>
            )}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export default PropertyGallery;
