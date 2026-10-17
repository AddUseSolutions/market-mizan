import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { cn } from "../utils/cn";

const DATASETS = [
  { class: "apartment", mode: "rent", label: "Apartment · Rent" },
  { class: "apartment", mode: "sale", label: "Apartment · Sale" },
  { class: "house", mode: "rent", label: "House · Rent" },
  { class: "house", mode: "sale", label: "House · Sale" }
];

function formatPps(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  if (v >= 1000) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatMom(pct) {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  const v = Number(pct) * 100;
  const abs = Math.abs(v);
  const digits = abs >= 10 ? 0 : 1;
  return `${abs.toFixed(digits)}%`;
}

function MomBadge({ pct }) {
  if (pct == null || !Number.isFinite(Number(pct))) {
    return <span className="text-[11px] text-white/40">—</span>;
  }
  const up = Number(pct) > 0;
  const flat = Math.abs(Number(pct)) < 0.0005;
  if (flat) return <span className="text-[11px] text-white/50">• 0%</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", up ? "text-emerald-400" : "text-rose-400")}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {formatMom(pct)}
    </span>
  );
}

export default function MarketIndicesBar() {
  const [dataset, setDataset] = useState(DATASETS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unit, setUnit] = useState("USD/m² living");
  const scrollerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/market-indices", { params: { class: dataset.class, mode: dataset.mode } })
      .then((r) => {
        if (cancelled) return;
        setItems(Array.isArray(r.data?.items) ? r.data.items : []);
        setUnit(r.data?.unit || "USD/m²");
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  function scrollBy(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.6), behavior: "smooth" });
  }

  return (
    <div className="border-b border-white/10 bg-[#0b1220] text-white">
      <div className="mx-auto flex max-w-7xl items-stretch gap-2 px-3 sm:px-4">
        <div className="relative shrink-0 py-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold tracking-wide text-white/90 hover:bg-white/5"
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            Market Indices
            <span className="text-white/50" aria-hidden>
              ▾
            </span>
          </button>
          {menuOpen ? (
            <>
              <button type="button" className="fixed inset-0 z-[60] cursor-default" aria-label="Close" onClick={() => setMenuOpen(false)} />
              <ul
                role="listbox"
                className="absolute left-0 top-full z-[70] mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-white/10 bg-[#121a2b] py-1 shadow-xl"
              >
                {DATASETS.map((d) => (
                  <li key={`${d.class}-${d.mode}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={dataset.class === d.class && dataset.mode === d.mode}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-xs",
                        dataset.class === d.class && dataset.mode === d.mode
                          ? "bg-white/10 font-semibold text-white"
                          : "text-white/80 hover:bg-white/5"
                      )}
                      onClick={() => {
                        setDataset(d);
                        setMenuOpen(false);
                      }}
                    >
                      {d.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div
          ref={scrollerRef}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={`${dataset.label} by sub-city (${unit})`}
        >
          {items.length ? (
            items.map((item) => (
              <Link
                key={item.district}
                to={`/?area=${encodeURIComponent(item.district)}&listing_mode=${dataset.mode === "rent" ? "for_rent" : "for_sale"}&property_type_group=${
                  dataset.class === "apartment" ? "residential_apartment" : "residential_villa"
                }`}
                className="flex shrink-0 items-center gap-2.5 rounded-full bg-black/55 px-3 py-1.5 ring-1 ring-white/10 transition hover:ring-white/25"
                title={`${item.district}: ${item.listingCount} listings · ${unit}`}
              >
                <span className="text-xs font-medium text-white/90">{item.district}</span>
                <span className="text-xs font-semibold tabular-nums text-white">{formatPps(item.avgPpsUsd)}</span>
                <MomBadge pct={item.momPpsPct} />
              </Link>
            ))
          ) : (
            <span className="px-2 text-xs text-white/45">Loading district indexes…</span>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <button
            type="button"
            className="rounded-md p-1.5 text-white/55 hover:bg-white/5 hover:text-white"
            aria-label="Scroll indices left"
            onClick={() => scrollBy(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-white/55 hover:bg-white/5 hover:text-white"
            aria-label="Scroll indices right"
            onClick={() => scrollBy(1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
