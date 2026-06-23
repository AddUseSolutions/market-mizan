import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardImageCarousel from "./CardImageCarousel";
import CardListingPrice, { listingModeBadgeLabel } from "./CardListingPrice";
import {
  buildCompareRows,
  displayCompareTitle,
  pickBestIndex
} from "../utils/compareProperty";
import { formatLivingArea } from "../utils/pricing";
import { parsePropertyImages } from "../utils/propertyImages";
import { cn } from "../utils/cn";

const MIN_COL_WIDTH = "min(72vw, 280px)";

function CompareProductHeader({ property, index, onRemove, t }) {
  const images = parsePropertyImages(property);
  const title = displayCompareTitle(property);
  const specs = [
    property?.bedrooms != null ? `${property.bedrooms} ${t("bedrooms")}` : null,
    formatLivingArea(property),
    property?.location_area || property?.location_district
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-w-0 flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {t("compareListingN", { n: index + 1 })}
        </span>
        <button
          type="button"
          className="rounded p-1.5 text-muted hover:bg-brand-muted hover:text-brand-deep"
          aria-label={t("compareRemove")}
          onClick={onRemove}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="relative aspect-[4/3] min-h-[120px] border-b border-line bg-brand-muted/30">
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} fit="contain" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 border-b border-line p-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
          {listingModeBadgeLabel(property, t)}
        </span>

        <div className="[&_.bg-primary]:rounded-lg [&_.bg-primary]:py-2">
          <CardListingPrice property={property} onRequestLabel={t("priceOnRequest")} t={t} variant="bar" />
        </div>

        <h2 className="line-clamp-3 text-sm font-semibold leading-snug text-brand-deep">{title}</h2>
        {specs ? <p className="line-clamp-2 text-xs text-muted">{specs}</p> : null}
        <Link
          to={`/property/${property.property_id}`}
          className="mt-auto text-xs font-medium text-primary hover:underline"
        >
          {t("viewDetails")} →
        </Link>
      </div>
    </div>
  );
}

function CompareValueCell({ property, row, value, highlighted }) {
  const title = displayCompareTitle(property);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col border-r-2 border-line bg-surface px-3 py-3 last:border-r-0",
        highlighted && "bg-primary/5"
      )}
    >
      <p className="mb-1.5 line-clamp-2 text-[10px] font-semibold leading-tight text-brand-deep/80">
        {title}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{row.label}</p>
      <p
        className={cn(
          "mt-1 break-words text-sm font-semibold leading-snug text-brand-deep",
          highlighted && "text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function CompareBoard({ properties, onRemove, t }) {
  const [hideIdentical, setHideIdentical] = useState(false);
  const count = properties?.length ?? 0;

  const rowsByProperty = useMemo(
    () => properties.map((property) => buildCompareRows(property, t)),
    [properties, t]
  );

  const baseRows = rowsByProperty[0] ?? [];

  const bestByRow = useMemo(() => {
    const map = {};
    for (const row of baseRows) {
      map[row.key] = pickBestIndex(row.key, properties);
    }
    return map;
  }, [baseRows, properties]);

  const visibleRows = useMemo(() => {
    if (!hideIdentical) return baseRows;
    return baseRows.filter((row, rowIdx) => {
      const first = row.value;
      return rowsByProperty.some((rows, colIdx) => colIdx > 0 && rows[rowIdx]?.value !== first);
    });
  }, [hideIdentical, baseRows, rowsByProperty]);

  const columnTemplate = `repeat(${count}, minmax(${MIN_COL_WIDTH}, 1fr))`;

  if (!count) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="sticky top-0 z-20 grid border-b-2 border-line bg-surface shadow-sm"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {properties.map((property, index) => (
              <div key={property.property_id} className="border-r-2 border-line last:border-r-0">
                <CompareProductHeader
                  property={property}
                  index={index}
                  onRemove={() => onRemove(property.property_id)}
                  t={t}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium text-brand-deep">{t("compareHideIdentical")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={hideIdentical}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                hideIdentical ? "bg-primary" : "bg-line"
              )}
              onClick={() => setHideIdentical((v) => !v)}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  hideIdentical && "translate-x-5"
                )}
              />
            </button>
          </div>

          <div className="border-b border-line bg-brand-muted/50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-brand-deep">{t("compareKeyDifferences")}</h3>
            <p className="mt-0.5 text-xs text-muted sm:hidden">{t("compareSwipeHint")}</p>
          </div>

          {visibleRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{t("compareAllIdentical")}</p>
          ) : (
            visibleRows.map((row) => {
              const rowIdx = baseRows.findIndex((r) => r.key === row.key);
              const bestIdx = bestByRow[row.key];
              return (
                <div
                  key={row.key}
                  className="grid border-b border-line last:border-0"
                  style={{ gridTemplateColumns: columnTemplate }}
                >
                  {properties.map((property, colIdx) => (
                    <CompareValueCell
                      key={property.property_id}
                      property={property}
                      row={row}
                      value={rowsByProperty[colIdx]?.[rowIdx]?.value ?? "—"}
                      highlighted={bestIdx === colIdx}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
