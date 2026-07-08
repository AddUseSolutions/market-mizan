import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { Input } from "./ui";
import SegmentedControl from "./ui/SegmentedControl";
import { cn } from "../utils/cn";

function formatPrice(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (currency === "usd") return n.toLocaleString("en-US");
  return n.toLocaleString("en-US");
}

function currencyLabel(currency) {
  return currency === "usd" ? "USD" : "ETB";
}

export default function PriceHistogramFilter({
  currency,
  onCurrencyChange,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  filterContext = {},
  className
}) {
  const [histogram, setHistogram] = useState(null);
  const [loading, setLoading] = useState(false);
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const boundsMin = histogram?.min_price ?? 0;
  const boundsMax = histogram?.max_price ?? (boundsMin || 1);
  const range = boundsMax - boundsMin || 1;

  const selectedMin = minValue !== "" && minValue != null ? Number(minValue) : boundsMin;
  const selectedMax = maxValue !== "" && maxValue != null ? Number(maxValue) : boundsMax;

  const loadHistogram = useCallback(() => {
    setLoading(true);
    const params = { ...filterContext, price_currency: currency };
    delete params.min_price;
    delete params.max_price;
    delete params.page;
    delete params.limit;
    api
      .get("/filters/price-histogram", { params })
      .then((r) => setHistogram(r.data))
      .catch(() => setHistogram(null))
      .finally(() => setLoading(false));
  }, [currency, JSON.stringify(filterContext)]);

  useEffect(() => {
    loadHistogram();
  }, [loadHistogram]);

  const maxCount = useMemo(() => {
    if (!histogram?.buckets?.length) return 1;
    return Math.max(1, ...histogram.buckets.map((b) => b.count));
  }, [histogram]);

  function valueFromClientX(clientX) {
    const track = trackRef.current;
    if (!track) return boundsMin;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = boundsMin + ratio * range;
    const step = range / 100;
    return Math.round(raw / step) * step;
  }

  function handlePointerDown(handle) {
    setDragging(handle);
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const val = valueFromClientX(e.clientX);
      if (dragging === "min") {
        const next = Math.min(val, selectedMax - range * 0.02);
        onMinChange(String(Math.max(boundsMin, Math.round(next))));
      } else {
        const next = Math.max(val, selectedMin + range * 0.02);
        onMaxChange(String(Math.min(boundsMax, Math.round(next))));
      }
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, selectedMin, selectedMax, boundsMin, boundsMax, range, onMinChange, onMaxChange]);

  const minPct = ((selectedMin - boundsMin) / range) * 100;
  const maxPct = ((selectedMax - boundsMin) / range) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      <SegmentedControl
        size="sm"
        aria-label="Price currency"
        value={currency}
        onChange={onCurrencyChange}
        options={[
          { value: "etb", label: "ETB" },
          { value: "usd", label: "USD" }
        ]}
      />

      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-medium text-muted">Min</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
              {currencyLabel(currency)}
            </span>
            <Input
              type="number"
              min="0"
              value={minValue}
              onChange={(e) => onMinChange(e.target.value)}
              className="pl-12"
              placeholder={formatPrice(boundsMin, currency)}
            />
          </div>
        </label>
        <span className="mt-5 shrink-0 text-muted">–</span>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-medium text-muted">Max</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
              {currencyLabel(currency)}
            </span>
            <Input
              type="number"
              min="0"
              value={maxValue}
              onChange={(e) => onMaxChange(e.target.value)}
              className="pl-12"
              placeholder={formatPrice(boundsMax, currency)}
            />
          </div>
        </label>
      </div>

      <div className="relative pt-1">
        {loading ? (
          <div className="mb-2 h-16 animate-pulse rounded-lg bg-brand-muted/50" />
        ) : (
          <div className="mb-3 flex h-16 items-end gap-[2px]">
            {(histogram?.buckets || []).map((bucket, i) => {
              const inRange = bucket.end >= selectedMin && bucket.start <= selectedMax;
              const height = `${Math.max(8, (bucket.count / maxCount) * 100)}%`;
              return (
                <div
                  key={`${bucket.start}-${i}`}
                  className={cn(
                    "flex-1 rounded-t-sm transition-colors",
                    inRange ? "bg-primary" : "bg-line"
                  )}
                  style={{ height }}
                  title={`${formatPrice(bucket.start, currency)} – ${formatPrice(bucket.end, currency)}: ${bucket.count}`}
                />
              );
            })}
          </div>
        )}

        <div ref={trackRef} className="relative h-2 rounded-full bg-line">
          <div
            className="absolute inset-y-0 rounded-full bg-brand-deep"
            style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          />
          <button
            type="button"
            aria-label="Minimum price"
            className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-deep bg-white shadow-md"
            style={{ left: `${minPct}%` }}
            onPointerDown={() => handlePointerDown("min")}
          />
          <button
            type="button"
            aria-label="Maximum price"
            className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-deep bg-white shadow-md"
            style={{ left: `${maxPct}%` }}
            onPointerDown={() => handlePointerDown("max")}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{currencyLabel(currency)} {formatPrice(boundsMin, currency)}</span>
          <span>{currencyLabel(currency)} {formatPrice(boundsMax, currency)}</span>
        </div>
      </div>
    </div>
  );
}
