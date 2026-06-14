import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

function IconDocument({ className = "", size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 4v4h4M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function GalleryPlaceholder({ label = "No photo" }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-line/40 text-sm text-muted">
      {label}
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
  const list = (Array.isArray(images) ? images : []).filter(Boolean);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(() => new Set());

  useEffect(() => {
    setActive(0);
    setFailed(new Set());
  }, [propertyId]);

  const safeActive = list.length ? active % list.length : 0;
  const current = list[safeActive];
  const showMain = current && !failed.has(current);

  const thumbCols = list.length <= 1 ? 1 : list.length === 2 ? 2 : 3;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-line/30">
        {showMain ? (
          <img
            key={`${propertyId}-${safeActive}`}
            className="h-full w-full object-cover"
            src={current}
            alt={`Image ${safeActive + 1}`}
            onError={() => setFailed((prev) => new Set(prev).add(current))}
          />
        ) : (
          <GalleryPlaceholder label={emptyLabel} />
        )}

        {statusLabel ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-deep px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {statusLabel}
          </span>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div
          className={cn(
            "gap-2",
            list.length <= 4 ? "grid" : "flex overflow-x-auto pb-1",
            list.length <= 4 && thumbCols === 1 && "grid-cols-1",
            list.length <= 4 && thumbCols === 2 && "grid-cols-2",
            list.length <= 4 && thumbCols === 3 && "grid-cols-3"
          )}
        >
          {list.map((img, idx) => {
            const thumbFailed = failed.has(img);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-current={safeActive === idx ? "true" : undefined}
                className={cn(
                  "h-20 shrink-0 overflow-hidden rounded-xl transition-all sm:h-24",
                  list.length > 4 && "w-28 sm:w-32",
                  safeActive === idx ? "ring-2 ring-primary ring-offset-1" : "opacity-75 hover:opacity-100"
                )}
              >
                {thumbFailed ? (
                  <div className="flex h-full w-full items-center justify-center bg-line/40 text-xs text-muted">—</div>
                ) : (
                  <img
                    src={img}
                    alt=""
                    loading={idx === safeActive ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                    onError={() => setFailed((prev) => new Set(prev).add(img))}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {sourceLabel ? (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <IconDocument className="shrink-0 text-gold" />
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
