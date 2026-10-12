import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { Container, Section, Button, SectionHeader, SegmentedControl } from "../components/ui";
import DashboardTabs from "../components/dashboard/DashboardTabs";
import { DashboardWidget, dashMuted, dashTable, dashTableTh, dashTableTd } from "../components/dashboard/DashboardWidget";
import LivePanel from "../components/analytics/LivePanel";
import { BarList, Funnel, TrendChart } from "../components/analytics/AnalyticsCharts";
import {
  EVENT_LABELS,
  RANGE_OPTIONS,
  delta,
  fillSeries,
  formatDuration,
  formatNumber,
  filterValueLabel,
  formatPercent,
  pageLabel
} from "../components/analytics/analyticsFormat";
import { cn } from "../utils/cn";

const METRICS = [
  { value: "visitors", label: "Visitors" },
  { value: "pageViews", label: "Views" },
  { value: "leads", label: "Leads" }
];
const FILTER_NAMES = {
  search: "Search text",
  listing_mode: "Rent / sale",
  property_type_group: "Property type",
  property_type: "Property type (exact)",
  area: "Sub-city / area",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  furnished: "Furnished",
  price: "Price",
  size: "Size",
  sort: "Sort",
  source: "Source"
};

function Kpi({ label, value, change, invert = false, hint }) {
  const good = change == null ? null : invert ? change < 0 : change > 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-soft" title={hint}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-heading">{value}</p>
      {change != null ? (
        <p className={cn("mt-1 text-xs font-medium", good ? "text-success" : "text-destructive")}>
          {change > 0 ? "▲" : change < 0 ? "▼" : "•"} {formatPercent(Math.abs(change), 0)} vs previous period
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">&nbsp;</p>
      )}
    </div>
  );
}

function SimpleTable({ columns, rows, empty = "No data yet." }) {
  if (!rows?.length) return <p className={dashMuted}>{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className={dashTable}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn(dashTableTh, c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={cn(dashTableTd, c.align === "right" && "text-right tabular-nums", c.className)}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");
  const [metric, setMetric] = useState("visitors");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get("/admin/analytics", { params: { range } })
      .then((r) => setReport(r.data))
      .catch((e) => setError(e.response?.data?.message || "Could not load analytics."))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const series = useMemo(() => fillSeries(report?.series, report?.range || range), [report, range]);
  const k = report?.kpis;
  const prev = report?.previous;
  const leads = report?.leads || {};
  const totalLeads = (leads.whatsapp || 0) + (leads.phone || 0) + (leads.email || 0) + (leads.contactForm || 0);
  const hasData = Boolean(k?.sessions);

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="Dashboard"
          title="Analytics"
          subtitle="Who visits Market Mizan, where they come from and what they do — to keep improving the site."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} size="sm" aria-label="Time range" />
              <Button variant="secondary" onClick={load} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          }
        />
        <DashboardTabs />

        <div className="space-y-6">
          <LivePanel />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading && !report ? <p className="text-muted">Loading analytics…</p> : null}

          {report ? (
            <>
              {!hasData ? (
                <p className="rounded-xl border border-line bg-brand-muted p-4 text-sm text-muted">
                  No visits recorded in this period yet. Tracking starts with this release — numbers fill up as visitors arrive.
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Kpi label="Visitors" value={formatNumber(k.visitors)} change={delta(k.visitors, prev?.visitors)}
                  hint={`${formatNumber(k.newVisitors)} new · ${formatNumber(k.returningVisitors)} returning`} />
                <Kpi label="Sessions" value={formatNumber(k.sessions)} change={delta(k.sessions, prev?.sessions)} />
                <Kpi label="Page views" value={formatNumber(k.pageViews)} change={delta(k.pageViews, prev?.pageViews)} />
                <Kpi label="Leads (contact sessions)" value={formatNumber(k.leadSessions)} change={delta(k.leadSessions, prev?.leadSessions)}
                  hint="Sessions with a WhatsApp click, call, email or contact form" />
                <Kpi label="Conversion rate" value={formatPercent(k.conversionRate)} change={delta(k.conversionRate, prev?.conversionRate)} />
                <Kpi label="Avg. time on site" value={formatDuration(k.avgDurationSec)} change={delta(k.avgDurationSec, prev?.avgDurationSec)} />
                <Kpi label="Pages / session" value={k.pagesPerSession.toFixed(1)} change={delta(k.pagesPerSession, prev?.pagesPerSession)} />
                <Kpi label="Bounce rate" value={formatPercent(k.bounceRate)} change={delta(k.bounceRate, prev?.bounceRate)} invert
                  hint="Sessions under 10 seconds with one page and no contact" />
              </div>

              <DashboardWidget
                title="Traffic over time"
                subtitle={`${formatNumber(k.newVisitors)} new and ${formatNumber(k.returningVisitors)} returning visitors`}
              >
                <div className="mb-3 flex justify-end">
                  <SegmentedControl options={METRICS} value={metric} onChange={setMetric} size="sm" aria-label="Metric" />
                </div>
                <TrendChart points={series} metric={metric} unit={report.bucket} color={metric === "leads" ? "var(--color-success)" : undefined} />
              </DashboardWidget>

              <div className="grid gap-6 lg:grid-cols-2">
                <DashboardWidget title="Leads" subtitle="Contact actions in this period">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      ["WhatsApp", leads.whatsapp],
                      ["Contact form", leads.contactForm],
                      ["Phone", leads.phone],
                      ["Email", leads.email],
                      ["Listings submitted", leads.listingSubmissions],
                      ["Total contacts", totalLeads]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-line bg-bg p-3 text-center">
                        <span className="block text-2xl font-semibold tabular-nums text-heading">{formatNumber(value)}</span>
                        <span className="mt-1 block text-xs text-muted">{label}</span>
                      </div>
                    ))}
                  </div>
                </DashboardWidget>
                <DashboardWidget
                  title="Visitor journey"
                  subtitle={`How far visitors get · ${formatPercent(report.funnel.visitors ? report.funnel.searched / report.funnel.visitors : 0)} used search or filters`}
                >
                  <Funnel
                    steps={[
                      { label: "Visited the site", value: report.funnel.visitors },
                      { label: "Opened a listing", value: report.funnel.viewedListing },
                      { label: "Contacted (WhatsApp, call, form)", value: report.funnel.contacted }
                    ]}
                  />
                </DashboardWidget>
              </div>

              <DashboardWidget title="Where visitors come from" subtitle="Google Ads is recognised by the ad click id (gclid) or utm_medium=cpc">
                <SimpleTable
                  columns={[
                    { key: "source", label: "Source", render: (r) => <span className="font-medium text-heading">{r.source}</span> },
                    { key: "medium", label: "Type", render: (r) => <span className="text-muted">{r.medium}</span> },
                    { key: "visitors", label: "Visitors", align: "right", render: (r) => formatNumber(r.visitors) },
                    { key: "sessions", label: "Sessions", align: "right", render: (r) => formatNumber(r.sessions) },
                    { key: "pps", label: "Pages / session", align: "right", render: (r) => r.pagesPerSession.toFixed(1) },
                    { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
                    { key: "conv", label: "Conversion", align: "right", render: (r) => formatPercent(r.sessions ? r.leads / r.sessions : 0) }
                  ]}
                  rows={report.sources}
                />
                {report.campaigns.length ? (
                  <div className="mt-5">
                    <h3 className="mb-2 text-sm font-semibold text-heading">Campaigns</h3>
                    <SimpleTable
                      columns={[
                        { key: "campaign", label: "Campaign", render: (r) => <span className="font-medium text-heading">{r.campaign}</span> },
                        { key: "source", label: "Source" },
                        { key: "sessions", label: "Sessions", align: "right", render: (r) => formatNumber(r.sessions) },
                        { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
                        { key: "conv", label: "Conversion", align: "right", render: (r) => formatPercent(r.sessions ? r.leads / r.sessions : 0) }
                      ]}
                      rows={report.campaigns}
                    />
                  </div>
                ) : null}
              </DashboardWidget>

              <div className="grid gap-6 lg:grid-cols-2">
                <DashboardWidget title="Most viewed pages">
                  <BarList
                    items={report.topPages}
                    valueKey="views"
                    labelKey="path"
                    renderLabel={(r) => (
                      <Link to={r.path} className="hover:text-primary hover:underline" title={r.path}>
                        {pageLabel(r.path)}
                      </Link>
                    )}
                  />
                </DashboardWidget>
                <DashboardWidget title="Landing pages" subtitle="First page of each visit">
                  <BarList items={report.landingPages} valueKey="views" labelKey="path" renderLabel={(r) => pageLabel(r.path)} />
                </DashboardWidget>
              </div>

              <DashboardWidget title="Top listings" subtitle="Ranked by contacts, then views">
                <SimpleTable
                  empty="No listing views yet."
                  columns={[
                    {
                      key: "title",
                      label: "Listing",
                      className: "max-w-[320px]",
                      render: (r) => (
                        <Link to={`/property/${encodeURIComponent(r.propertyId)}`} className="block truncate text-primary hover:underline" title={r.title || r.propertyId}>
                          {r.ref ? <span className="mr-1.5 font-semibold">{r.ref}</span> : null}
                          {r.title || r.propertyId}
                        </Link>
                      )
                    },
                    { key: "area", label: "Area", render: (r) => r.area || "—" },
                    { key: "views", label: "Views", align: "right", render: (r) => formatNumber(r.views) },
                    { key: "visitors", label: "Visitors", align: "right", render: (r) => formatNumber(r.visitors) },
                    { key: "whatsapp", label: "WhatsApp", align: "right", render: (r) => formatNumber(r.whatsapp) },
                    { key: "contact", label: "Form", align: "right", render: (r) => formatNumber(r.contact) },
                    { key: "leads", label: "Leads", align: "right", render: (r) => <span className="font-semibold">{formatNumber(r.leads)}</span> }
                  ]}
                  rows={report.listings}
                />
              </DashboardWidget>

              <div className="grid gap-6 lg:grid-cols-2">
                <DashboardWidget title="What people click" subtitle="Buttons and links, most used first">
                  <BarList
                    items={report.clicks}
                    valueKey="count"
                    labelKey="label"
                    renderLabel={(r) => (
                      <>
                        <span className="mr-2 rounded bg-line px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                          {EVENT_LABELS[r.event] || r.event}
                        </span>
                        {r.label}
                      </>
                    )}
                  />
                </DashboardWidget>
                <DashboardWidget title="Searches" subtitle="Search and filter combinations with average results">
                  <BarList
                    items={report.searches}
                    valueKey="count"
                    labelKey="term"
                    extra={(r) => (
                      <span className={cn("text-xs", r.avgResults === 0 ? "font-semibold text-destructive" : "text-muted")}>
                        ⌀ {formatNumber(r.avgResults)} results
                      </span>
                    )}
                    emptyText="No searches yet."
                  />
                </DashboardWidget>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <DashboardWidget title="Searches with no results" subtitle="Demand we cannot serve yet — ideas for new listings">
                  <BarList items={report.zeroResultSearches} valueKey="count" labelKey="term" emptyText="None — every search found listings." />
                </DashboardWidget>
                <DashboardWidget title="Filter usage" subtitle="Which filters visitors use and their most common values">
                  {report.filters.length ? (
                    <ul className="space-y-3">
                      {report.filters.map((f) => (
                        <li key={f.key}>
                          <p className="text-sm">
                            <span className="font-medium text-heading">{FILTER_NAMES[f.key] || f.key}</span>
                            <span className="ml-2 text-xs text-muted">{formatNumber(f.total)}×</span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {f.top.map((v) => (
                              <span key={v.value} className="rounded-full border border-line bg-bg px-2 py-0.5 text-xs text-heading">
                                {filterValueLabel(v.value)} <span className="text-muted">{v.count}</span>
                              </span>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={dashMuted}>No filters used yet.</p>
                  )}
                </DashboardWidget>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <DashboardWidget title="Devices">
                  <BarList items={report.tech.devices} valueKey="sessions" labelKey="name" renderLabel={(r) => r.name.charAt(0).toUpperCase() + r.name.slice(1)} />
                </DashboardWidget>
                <DashboardWidget title="Countries" subtitle="From the browser time zone">
                  <BarList items={report.tech.countries} valueKey="sessions" labelKey="name" />
                </DashboardWidget>
                <DashboardWidget title="Browsers">
                  <BarList items={report.tech.browsers} valueKey="sessions" labelKey="name" />
                </DashboardWidget>
                <DashboardWidget title="Operating systems">
                  <BarList items={report.tech.os} valueKey="sessions" labelKey="name" />
                </DashboardWidget>
              </div>

              <p className="text-xs text-muted">
                Anonymous first-party statistics: no cookies, no IP addresses, no personal data. Admin devices and bots are excluded.
                Updated {new Date(report.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} (cached 1 min).
              </p>
            </>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
