import { useState } from "react";
import { cn } from "../../utils/cn";
import { bucketLabel, formatNumber, formatPercent } from "./analyticsFormat";

const CHART_W = 960;
const CHART_H = 220;
const PAD = { top: 12, right: 8, bottom: 24, left: 36 };

/** Area chart of one metric over time, with hover read-out. No chart library needed. */
export function TrendChart({ points, metric, unit, color = "var(--color-primary)" }) {
  const [hover, setHover] = useState(null);
  if (!points?.length) return null;
  const values = points.map((p) => Number(p[metric]) || 0);
  const max = Math.max(...values, 1);
  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const x = (i) => PAD.left + (points.length > 1 ? i * step : innerW / 2);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-auto w-full" role="img" aria-label={`${metric} over time`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        <path d={area} fill={color} opacity="0.12" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.t}
              x={x(i)}
              y={CHART_H - 6}
              textAnchor={i === 0 ? "start" : i >= points.length - labelEvery ? "end" : "middle"}
              fontSize="11"
              fill="var(--color-muted)"
            >
              {bucketLabel(p.t, unit)}
            </text>
          ) : null
        )}
        {active ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke={color} opacity="0.4" />
            <circle cx={x(hover)} cy={y(values[hover])} r="4" fill={color} />
          </g>
        ) : null}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.t}`}
            x={x(i) - step / 2}
            y={PAD.top}
            width={Math.max(step, 4)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {active ? (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-soft">
          <p className="font-semibold text-heading">{bucketLabel(active.t, unit)}</p>
          <p className="text-muted">
            {formatNumber(active.visitors)} visitors · {formatNumber(active.pageViews)} views · {formatNumber(active.leads)} leads
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Small column chart (e.g. active sessions per minute). */
export function MiniBars({ points, valueKey, height = 56, labelFor }) {
  if (!points?.length) return null;
  const max = Math.max(...points.map((p) => Number(p[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label="Activity">
      {points.map((p, i) => {
        const v = Number(p[valueKey]) || 0;
        return (
          <div
            key={p.t || i}
            className={cn("flex-1 rounded-t", v ? "bg-primary/80" : "bg-line")}
            style={{ height: `${Math.max(3, (v / max) * height)}px` }}
            title={labelFor ? labelFor(p) : String(v)}
          />
        );
      })}
    </div>
  );
}

/** Horizontal bar list: label, bar proportional to value, value (+ optional share). */
export function BarList({ items, valueKey = "value", labelKey = "label", renderLabel, extra, emptyText = "No data yet.", max: maxOverride }) {
  if (!items?.length) return <p className="text-sm text-muted">{emptyText}</p>;
  const total = items.reduce((s, it) => s + (Number(it[valueKey]) || 0), 0);
  const max = maxOverride || Math.max(...items.map((it) => Number(it[valueKey]) || 0), 1);
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => {
        const v = Number(it[valueKey]) || 0;
        return (
          <li key={`${it[labelKey]}-${i}`} className="relative overflow-hidden rounded-md">
            <div className="absolute inset-y-0 left-0 rounded-md bg-primary/10" style={{ width: `${(v / max) * 100}%` }} />
            <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
              <span className="min-w-0 truncate text-heading">{renderLabel ? renderLabel(it) : it[labelKey]}</span>
              <span className="flex shrink-0 items-center gap-2 tabular-nums">
                {extra ? extra(it) : null}
                <span className="font-semibold text-heading">{formatNumber(v)}</span>
                {total ? <span className="w-10 text-right text-xs text-muted">{formatPercent(v / total, 0)}</span> : null}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Funnel with step-to-step conversion. */
export function Funnel({ steps }) {
  const top = Math.max(Number(steps?.[0]?.value) || 0, 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const v = Number(s.value) || 0;
        const prev = i ? Number(steps[i - 1].value) || 0 : null;
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-heading">{s.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold text-heading">{formatNumber(v)}</span>
                <span className="ml-2 text-xs text-muted">
                  {i === 0 ? "100%" : `${formatPercent(v / top)} of all${prev && v <= prev ? ` · ${formatPercent(v / prev)} of previous step` : ""}`}
                </span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(v ? 2 : 0, (v / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
