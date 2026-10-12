/**
 * First-party analytics tracker (feeds the admin Analytics page).
 * Anonymous: a random visitor id in localStorage, no cookies, no personal data.
 * Key conversions are mirrored to GA4 so Google Ads can import them.
 */

const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const ENDPOINT = `${apiBase}/api/a`;

const VID_KEY = "mm_vid";
const SESSION_KEY = "mm_session";
const STAFF_KEY = "mm_staff";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FLUSH_MS = 5000;
const HEARTBEAT_MS = 30000;
const IDLE_MS = 10 * 60 * 1000;
const CAMPAIGN_PARAMS = ["gclid", "gbraid", "wbraid", "fbclid", "msclkid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const LEAD_METHOD = {
  whatsapp_click: "whatsapp",
  phone_click: "phone",
  email_click: "email",
  contact_submit: "contact_form"
};

let queue = [];
let started = false;
let lastInteraction = Date.now();

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function storageGet(store, key) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(store, key, value) {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode / quota: tracking degrades gracefully */
  }
}

function isDisabled() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  if (navigator.webdriver) return true;
  if (storageGet(localStorage, STAFF_KEY) === "1") return true;
  const host = window.location.hostname;
  if (!import.meta.env.VITE_TRACK_LOCAL && (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local"))) {
    return true;
  }
  return false;
}

/** Strip ad click ids and UTM tags so paths group cleanly. */
export function cleanPath(pathWithQuery) {
  const raw = String(pathWithQuery || "/");
  const i = raw.indexOf("?");
  if (i < 0) return raw.slice(0, 300);
  const params = new URLSearchParams(raw.slice(i + 1));
  CAMPAIGN_PARAMS.forEach((k) => params.delete(k));
  const q = params.toString();
  return `${raw.slice(0, i)}${q ? `?${q}` : ""}`.slice(0, 300);
}

function currentPath() {
  return cleanPath(`${window.location.pathname}${window.location.search}`);
}

function readCampaign() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  ["source", "medium", "campaign", "term", "content"].forEach((k) => {
    const v = params.get(`utm_${k}`);
    if (v) utm[k] = v.slice(0, 120);
  });
  const gclid = Boolean(params.get("gclid") || params.get("gbraid") || params.get("wbraid"));
  return { utm, gclid, tagged: gclid || Object.keys(utm).length > 0 };
}

function visitorId() {
  let id = storageGet(localStorage, VID_KEY);
  if (!id) {
    id = randomId();
    storageSet(localStorage, VID_KEY, id);
  }
  return id;
}

/** Session = activity with < 30 min gaps (shared across tabs); a new ad click starts a new one. */
function session() {
  const now = Date.now();
  let s = null;
  try {
    s = JSON.parse(storageGet(localStorage, SESSION_KEY) || "null");
  } catch {
    s = null;
  }
  const campaign = readCampaign();
  const campaignChanged =
    campaign.tagged && s && JSON.stringify({ utm: campaign.utm, gclid: campaign.gclid }) !== JSON.stringify({ utm: s.utm, gclid: s.gclid });
  if (!s || now - s.last > SESSION_TIMEOUT_MS || campaignChanged) {
    s = {
      id: randomId(),
      utm: campaign.utm,
      gclid: campaign.gclid,
      ref: document.referrer || null
    };
  }
  s.last = now;
  storageSet(localStorage, SESSION_KEY, JSON.stringify(s));
  return s;
}

function send(events) {
  if (isDisabled()) return;
  const s = session();
  const payload = JSON.stringify({
    vid: visitorId(),
    sid: s.id,
    utm: s.utm,
    gclid: s.gclid,
    ref: s.ref,
    path: currentPath(),
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    events
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }))) return;
  } catch {
    /* fall through to fetch */
  }
  fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}

function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, 40);
  send(batch);
  if (queue.length) flush();
}

function forwardToGa(event, data) {
  const gtag = typeof window !== "undefined" ? window.gtag : null;
  if (typeof gtag !== "function") return;
  if (LEAD_METHOD[event]) {
    gtag("event", "generate_lead", { method: LEAD_METHOD[event], listing_id: data.pid || undefined });
  } else if (event === "list_property_submit") {
    gtag("event", "list_property_submit", {});
  } else if (event === "search" && data.l) {
    gtag("event", "search", { search_term: data.l });
  }
}

/** Queue an event: track("whatsapp_click", { label, propertyId, value }). */
export function track(event, { label, propertyId, value, path } = {}) {
  if (typeof window === "undefined") return;
  const data = { e: event, p: cleanPath(path || currentPath()) };
  if (label) data.l = String(label).slice(0, 160);
  if (propertyId) data.pid = String(propertyId).slice(0, 80);
  if (value !== undefined && value !== null) data.v = value;
  forwardToGa(event, data);
  if (isDisabled()) return;
  queue.push(data);
  if (LEAD_METHOD[event] || event === "list_property_submit") flush();
}

export function trackPageView(path) {
  track("page_view", { path });
}

/** Admin / staff devices are excluded from statistics (persisted, also after logout). */
export function markStaffDevice(isStaff) {
  if (isStaff) storageSet(localStorage, STAFF_KEY, "1");
}

function propertyIdFromPath() {
  const m = window.location.pathname.match(/^\/property\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function labelFor(el) {
  const explicit = el.getAttribute("data-track") || el.getAttribute("aria-label") || el.getAttribute("title");
  const text = explicit || el.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 80) || null;
}

function onClick(e) {
  const el = e.target?.closest?.("a[href], button, [data-track], [role='button']");
  if (!el || el.closest("[data-no-track]")) return;
  const propertyId = el.closest("[data-property-id]")?.getAttribute("data-property-id") || propertyIdFromPath();
  const label = labelFor(el);
  const href = el.tagName === "A" ? el.getAttribute("href") || "" : "";

  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)/i.test(href)) {
    track("whatsapp_click", { label, propertyId });
    return;
  }
  if (href.startsWith("tel:")) {
    track("phone_click", { label, propertyId });
    return;
  }
  if (href.startsWith("mailto:")) {
    track("email_click", { label, propertyId });
    return;
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.hostname !== window.location.hostname) {
        track("outbound_click", { label: `${url.hostname} · ${label || ""}`.slice(0, 160), propertyId });
        return;
      }
    } catch {
      /* relative or malformed: treat as internal */
    }
  }
  track("click", { label, propertyId });
}

function onActivity() {
  lastInteraction = Date.now();
}

export function startTracking() {
  if (started || typeof window === "undefined") return;
  started = true;
  document.addEventListener("click", onClick, { capture: true, passive: true });
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach((type) =>
    window.addEventListener(type, onActivity, { passive: true })
  );
  setInterval(flush, FLUSH_MS);
  setInterval(() => {
    if (document.visibilityState !== "visible" || Date.now() - lastInteraction > IDLE_MS) return;
    if (queue.length) flush();
    else send([]);
  }, HEARTBEAT_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
