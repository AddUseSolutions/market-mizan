export const RANGE_OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" }
];

const RANGE_BUCKETS = { "24h": { unit: "hour", count: 24 }, "7d": { unit: "day", count: 7 }, "30d": { unit: "day", count: 30 }, "90d": { unit: "day", count: 90 } };
const UNIT_MS = { minute: 60e3, hour: 3600e3, day: 86400e3 };

export const EVENT_LABELS = {
  page_view: "Page view",
  click: "Click",
  listing_view: "Listing view",
  whatsapp_click: "WhatsApp",
  phone_click: "Phone call",
  email_click: "Email",
  contact_submit: "Contact form",
  outbound_click: "External link",
  search: "Search / filter",
  compare_add: "Added to compare",
  share_click: "Share",
  gallery_open: "Gallery",
  list_property_start: "Started listing",
  list_property_submit: "Listing submitted"
};

const FILTER_VALUE_LABELS = { for_rent: "Rent", for_sale: "Buy", true: "Yes", false: "No" };

export function filterValueLabel(value) {
  const v = String(value || "");
  if (FILTER_VALUE_LABELS[v]) return FILTER_VALUE_LABELS[v];
  const stripped = v.replace(/^(residential|commercial|land)_/, "").replace(/_/g, " ");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(n) || 0));
}

export function formatPercent(ratio, digits = 1) {
  const n = Number(ratio) || 0;
  return `${(n * 100).toFixed(n > 0 && n < 0.1 ? digits : 0)}%`;
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function timeAgo(iso) {
  const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

/** Relative change vs previous period, or null when there is nothing to compare against. */
export function delta(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (!p) return null;
  return (c - p) / p;
}

export function pageLabel(path) {
  const p = String(path || "/");
  const clean = p.split("?")[0] || "/";
  if (clean === "/") return p.includes("?") ? "Listings (filtered)" : "Home / listings";
  const m = clean.match(/^\/property\/([^/]+)/);
  if (m) return `Listing ${decodeURIComponent(m[1])}`;
  const names = {
    "/list-your-property": "List your property",
    "/premium": "Premium plans",
    "/contact": "Contact",
    "/about": "About",
    "/compare": "Compare",
    "/neighborhoods": "Neighborhood map",
    "/login": "Login",
    "/dashboard": "Dashboard",
    "/privacy": "Privacy",
    "/terms": "Terms",
    "/legal-notice": "Legal notice",
    "/sitemap": "Sitemap"
  };
  return names[clean] || clean;
}

/** Fill gaps so the chart shows every hour/day of the range, including empty ones. */
export function fillSeries(series, range) {
  const { unit, count } = RANGE_BUCKETS[range] || RANGE_BUCKETS["7d"];
  const step = UNIT_MS[unit];
  const byKey = new Map((series || []).map((r) => [Math.round(new Date(r.t).getTime() / step), r]));
  const end = new Date();
  if (unit === "hour") end.setUTCMinutes(0, 0, 0);
  else end.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = end.getTime() - i * step;
    const hit = byKey.get(Math.round(t / step));
    out.push({ t: new Date(t).toISOString(), visitors: 0, sessions: 0, pageViews: 0, leads: 0, ...(hit || {}) });
  }
  return out;
}

export function bucketLabel(iso, unit) {
  const d = new Date(iso);
  if (unit === "hour" || unit === "minute") return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
