const test = require("node:test");
const assert = require("node:assert/strict");
const { classifySource, parseUserAgent, normalizeBatch, countryFromTimezone } = require("./analyticsStore");
const { filterUsage, mergeByPath } = require("./analyticsReport");

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

test("classifySource attributes Google Ads, UTM, search, social, referral and direct", () => {
  assert.equal(classifySource({ gclid: true, referrer: "https://www.google.com/" }).source, "Google Ads");
  assert.equal(classifySource({ utm: { source: "google", medium: "cpc", campaign: "launch" } }).source, "Google Ads");
  const fb = classifySource({ utm: { source: "facebook", medium: "social", campaign: "oct" } });
  assert.deepEqual([fb.source, fb.medium, fb.campaign], ["facebook", "social", "oct"]);
  assert.equal(classifySource({ referrer: "https://www.google.com.et/" }).source, "Google Search");
  assert.equal(classifySource({ referrer: "https://l.facebook.com/l.php?u=x" }).source, "Facebook");
  assert.equal(classifySource({ referrer: "https://t.me/addis_homes" }).source, "Telegram");
  assert.equal(classifySource({ referrer: "https://blog.example.org/post" }).source, "blog.example.org");
  assert.equal(classifySource({ referrer: "https://mmizan.com/about", ownHosts: ["mmizan.com"] }).source, "Direct");
  assert.equal(classifySource({}).source, "Direct");
});

test("parseUserAgent detects device, browser and OS", () => {
  assert.deepEqual(parseUserAgent(IPHONE), { device: "mobile", browser: "Safari", os: "iOS" });
  assert.deepEqual(parseUserAgent(ANDROID_CHROME), { device: "mobile", browser: "Chrome", os: "Android" });
  assert.deepEqual(parseUserAgent(MAC_CHROME), { device: "desktop", browser: "Chrome", os: "macOS" });
});

test("normalizeBatch validates ids, drops bots and unknown events, summarises the session", () => {
  const body = {
    vid: "v-1234567890ab",
    sid: "s-1234567890ab",
    tz: "Africa/Addis_Ababa",
    lang: "en-US",
    gclid: true,
    events: [
      { e: "page_view", p: "/?area=Bole" },
      { e: "whatsapp_click", p: "/property/abc", pid: "abc", l: "WhatsApp" },
      { e: "evil_event", p: "/x" },
      { e: "search", p: "/?search=villa", l: "villa", v: "12" }
    ]
  };
  const batch = normalizeBatch(body, ANDROID_CHROME);
  assert.equal(batch.events.length, 3);
  assert.equal(batch.events[2].value, 12);
  assert.equal(batch.session.source, "Google Ads");
  assert.equal(batch.session.country, "Ethiopia");
  assert.equal(batch.session.pageViews, 1);
  assert.equal(batch.session.hasLead, true);
  assert.equal(batch.session.landingPath, "/?area=Bole");

  assert.equal(normalizeBatch(body, "Googlebot/2.1 (+http://www.google.com/bot.html)"), null);
  assert.equal(normalizeBatch({ ...body, vid: "x" }, ANDROID_CHROME), null);
  assert.equal(normalizeBatch({ ...body, sid: "<script>alert(1)</script>" }, ANDROID_CHROME), null);
});

test("countryFromTimezone maps common zones", () => {
  assert.equal(countryFromTimezone("Europe/Zurich"), "Switzerland");
  assert.equal(countryFromTimezone("America/New_York"), "United States");
  assert.equal(countryFromTimezone("Pacific/Fiji"), null);
});

test("filterUsage and mergeByPath aggregate query strings", () => {
  const usage = filterUsage([
    "/?area=Bole,Yeka&listing_mode=rent&min_price=500",
    "/?area=Bole&property_type_group=apartment&page=2",
    "/property/x"
  ]);
  const area = usage.find((f) => f.key === "area");
  assert.deepEqual(area.top[0], { value: "Bole", count: 2 });
  assert.equal(usage.find((f) => f.key === "price").top[0].value, "≥ 500");
  assert.equal(usage.some((f) => f.key === "page"), false);

  const merged = mergeByPath([
    { path: "/?area=Bole", views: 3, visitors: 2 },
    { path: "/", views: 5, visitors: 4 },
    { path: "/about", views: 1, visitors: 1 }
  ]);
  assert.deepEqual(merged[0], { path: "/", views: 8, visitors: 6 });
});
