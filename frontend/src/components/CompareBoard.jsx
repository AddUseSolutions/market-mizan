import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CardListingPrice, { listingModeBadgeLabel } from "./CardListingPrice";
import {
  buildCompareRows,
  displayCompareTitle,
  pickBestIndex
} from "../utils/compareProperty";
import { formatLivingArea } from "../utils/pricing";
import { parsePropertyImages } from "../utils/propertyImages";
import { cn } from "../utils/cn";

/** ~75% viewport per column — peek of next listing visible (Digitec-style). */
const MOBILE_COL_WIDTH = "75vw";
const DESKTOP_LABEL_COL = "10rem";

function RemoveButton({ onRemove, label, className }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg p-1.5 text-muted hover:bg-brand-muted hover:text-brand-deep",
        className
      )}
      aria-label={label}
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
  );
}

function CompareHeroImage({ property, emptyLabel, className }) {
  const images = parsePropertyImages(property);
  const src = images[0];

  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center bg-brand-muted/40 text-sm text-muted",
          className
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-[4/3] w-full overflow-hidden bg-brand-muted/30", className)}>
      <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
    </div>
  );
}

/** Mobile / Digitec: image on top, title & meta below. */
function CompareMobileProductCard({ property, index, onRemove, t }) {
  const title = displayCompareTitle(property);
  const specs = [
    property?.bedrooms != null ? `${property.bedrooms} ${t("bedrooms")}` : null,
    formatLivingArea(property),
    property?.location_area || property?.location_district
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex h-full min-w-0 flex-col border-r-2 border-line bg-surface last:border-r-0">
      <div className="relative border-b border-line">
        <CompareHeroImage property={property} emptyLabel={t("noPhoto")} />
        <RemoveButton
          onRemove={onRemove}
          label={t("compareRemove")}
          className="absolute right-1 top-1 bg-surface/90 shadow-sm backdrop-blur-sm"
        />
        <span className="absolute left-2 top-2 rounded bg-brand-deep/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {t("compareListingN", { n: index + 1 })}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
          {listingModeBadgeLabel(property, t)}
        </span>
        <h2 className="line-clamp-3 text-sm font-semibold leading-snug text-brand-deep">{title}</h2>
        <CardListingPrice
          property={property}
          onRequestLabel={t("priceOnRequest")}
          t={t}
          variant="compact"
        />
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

/** Desktop: compact row with thumbnail beside text. */
function CompareDesktopProductCard({ property, index, onRemove, t }) {
  const title = displayCompareTitle(property);
  const images = parsePropertyImages(property);
  const src = images[0];
  const specs = [
    property?.bedrooms != null ? `${property.bedrooms} ${t("bedrooms")}` : null,
    formatLivingArea(property),
    property?.location_area || property?.location_district
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-b border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {t("compareListingN", { n: index + 1 })}
        </span>
        <RemoveButton onRemove={onRemove} label={t("compareRemove")} />
      </div>
      <div className="flex gap-3">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-muted/40">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted">{t("noPhoto")}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
            {listingModeBadgeLabel(property, t)}
          </span>
          <h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-brand-deep">{title}</h2>
          <CardListingPrice property={property} onRequestLabel={t("priceOnRequest")} t={t} variant="compact" />
          {specs ? <p className="mt-1 line-clamp-2 text-xs text-muted">{specs}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CompareToolbar({ hideIdentical, onToggle, t }) {
  return (
    <>
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
          onClick={onToggle}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              hideIdentical && "translate-x-5"
            )}
          />
        </button>
      </div>

      <div className="border-b border-line bg-brand-muted/40 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-brand-deep">{t("compareKeyDifferences")}</h3>
        <p className="mt-0.5 text-xs text-muted md:hidden">{t("compareSwipeHint")}</p>
      </div>
    </>
  );
}

function CompareMobileBoard({ properties, visibleRows, rowsByProperty, baseRows, bestByRow, onRemove, t }) {
  const count = properties.length;
  const columnTemplate = `repeat(${count}, ${MOBILE_COL_WIDTH})`;

  return (
    <div className="md:hidden">
      <div className="snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-max">
          <div
            className="grid border-b-2 border-line"
            style={{ gridTemplateColumns: columnTemplate }}
          >
            {properties.map((property, index) => (
              <CompareMobileProductCard
                key={property.property_id}
                property={property}
                index={index}
                onRemove={() => onRemove(property.property_id)}
                t={t}
              />
            ))}
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
                    <div
                      key={property.property_id}
                      className={cn(
                        "min-w-0 border-r-2 border-line px-3 py-3 last:border-r-0",
                        bestIdx === colIdx && "bg-primary/5"
                      )}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{row.label}</p>
                      <p
                        className={cn(
                          "mt-1 break-words text-sm font-semibold leading-snug text-brand-deep",
                          bestIdx === colIdx && "text-primary"
                        )}
                      >
                        {rowsByProperty[colIdx]?.[rowIdx]?.value ?? "—"}
                      </p>
                    </div>
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

function CompareDesktopBoard({
  properties,
  visibleRows,
  rowsByProperty,
  baseRows,
  bestByRow,
  onRemove,
  t
}) {
  const count = properties.length;
  const columnTemplate = `${DESKTOP_LABEL_COL} repeat(${count}, minmax(180px, 1fr))`;

  return (
    <div className="hidden overflow-x-auto md:block">
      <div className="min-w-[640px]">
        <div
          className="grid border-b-2 border-line bg-surface"
          style={{ gridTemplateColumns: `${DESKTOP_LABEL_COL} repeat(${count}, minmax(180px, 1fr))` }}
        >
          <div className="border-r border-line bg-brand-muted/30" />
          {properties.map((property, index) => (
            <div key={property.property_id} className="border-r border-line last:border-r-0">
              <CompareDesktopProductCard
                property={property}
                index={index}
                onRemove={() => onRemove(property.property_id)}
                t={t}
              />
            </div>
          ))}
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
                <div className="flex items-center border-r border-line bg-brand-muted/20 px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted">
                  {row.label}
                </div>
                {properties.map((property, colIdx) => (
                  <div
                    key={property.property_id}
                    className={cn(
                      "flex items-center border-r border-line px-3 py-3 text-sm font-semibold text-brand-deep last:border-r-0",
                      bestIdx === colIdx && "bg-primary/5 text-primary"
                    )}
                  >
                    {rowsByProperty[colIdx]?.[rowIdx]?.value ?? "—"}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
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

  if (!count) return null;

  return (
    <div className="overflow-hidden border-y border-line bg-surface md:rounded-2xl md:border md:shadow-soft">
      <CompareToolbar
        hideIdentical={hideIdentical}
        onToggle={() => setHideIdentical((v) => !v)}
        t={t}
      />

      <CompareMobileBoard
        properties={properties}
        visibleRows={visibleRows}
        rowsByProperty={rowsByProperty}
        baseRows={baseRows}
        bestByRow={bestByRow}
        onRemove={onRemove}
        t={t}
      />

      <CompareDesktopBoard
        properties={properties}
        visibleRows={visibleRows}
        rowsByProperty={rowsByProperty}
        baseRows={baseRows}
        bestByRow={bestByRow}
        onRemove={onRemove}
        t={t}
      />
    </div>
  );
}
