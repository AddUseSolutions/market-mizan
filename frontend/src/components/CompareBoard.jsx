import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardImageCarousel from "./CardImageCarousel";
import CardListingPrice, { listingModeBadgeLabel } from "./CardListingPrice";
import {
  buildCompareRows,
  displayCompareTitle,
  pickBetterValue
} from "../utils/compareProperty";
import { formatLivingArea } from "../utils/pricing";
import { parsePropertyImages } from "../utils/propertyImages";
import { cn } from "../utils/cn";

function CompareProductHeader({ property, onRemove, t }) {
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
    <div className="flex min-w-0 flex-col border-line bg-surface">
      <div className="flex items-center justify-end border-b border-line px-2 py-1.5">
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

      <div className="relative aspect-[4/3] min-h-[100px] bg-line/30">
        <CardImageCarousel images={images} emptyLabel={t("noPhoto")} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
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

export default function CompareBoard({ left, right, onRemoveLeft, onRemoveRight, t }) {
  const [hideIdentical, setHideIdentical] = useState(false);

  const rowsLeft = useMemo(() => (left ? buildCompareRows(left, t) : []), [left, t]);
  const rowsRight = useMemo(() => (right ? buildCompareRows(right, t) : []), [right, t]);

  const betterByRow = useMemo(() => {
    const map = {};
    if (!left || !right) return map;
    for (const row of rowsLeft) {
      map[row.key] = pickBetterValue(row.key, left, right);
    }
    return map;
  }, [left, right, rowsLeft]);

  const visibleRows = useMemo(() => {
    if (!hideIdentical) return rowsLeft;
    return rowsLeft.filter((row, idx) => row.value !== rowsRight[idx]?.value);
  }, [hideIdentical, rowsLeft, rowsRight]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      {/* Galaxus-style: always 2 columns side by side */}
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <CompareProductHeader property={left} onRemove={onRemoveLeft} t={t} />
        <CompareProductHeader property={right} onRemove={onRemoveRight} t={t} />
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
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
      </div>

      {visibleRows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">{t("compareAllIdentical")}</p>
      ) : (
        visibleRows.map((row) => {
          const idx = rowsLeft.findIndex((r) => r.key === row.key);
          const rightRow = rowsRight[idx];
          const better = betterByRow[row.key];
          return (
            <div key={row.key} className="border-b border-line last:border-0">
              <div className="bg-surface px-3 py-2 text-xs font-bold text-muted">{row.label}</div>
              <div className="grid grid-cols-2 divide-x divide-line">
                <div
                  className={cn(
                    "min-w-0 break-words px-3 py-2.5 text-sm font-semibold text-brand-deep",
                    better === "left" && "bg-primary/5 text-primary"
                  )}
                >
                  {row.value}
                </div>
                <div
                  className={cn(
                    "min-w-0 break-words px-3 py-2.5 text-sm font-semibold text-brand-deep",
                    better === "right" && "bg-primary/5 text-primary"
                  )}
                >
                  {rightRow?.value ?? "—"}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
