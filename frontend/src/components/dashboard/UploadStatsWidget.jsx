import { Link } from "react-router-dom";
import {
  DashboardWidget,
  dashStat,
  dashStatValue,
  dashStatLabel,
  dashMuted,
  dashTable,
  dashTableTh,
  dashTableTd
} from "./DashboardWidget";
import { cn } from "../../utils/cn";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-900",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};
const STATUS_LABELS = { pending: "Pending", published: "Approved", rejected: "Rejected" };

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonth(ym) {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y || !m) return ym || "";
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function StatusBadge({ status }) {
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLES[status] || "bg-line text-muted")}>
      {STATUS_LABELS[status] || status || "—"}
    </span>
  );
}

function MonthlyBars({ monthly }) {
  const rows = (monthly || []).slice(-12);
  if (!rows.length) return <p className={dashMuted}>No uploads in the last 12 months.</p>;
  const max = Math.max(...rows.map((r) => r.uploads), 1);
  return (
    <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Uploads per month">
      {rows.map((r) => (
        <div key={r.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${r.uploads} uploads · ${r.uploaders} people`}>
          <span className="text-[11px] font-semibold text-brand-deep">{r.uploads}</span>
          <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, (r.uploads / max) * 96)}px` }} />
          <span className="truncate text-[10px] text-muted">{formatMonth(r.month)}</span>
        </div>
      ))}
    </div>
  );
}

export default function UploadStatsWidget({ uploads }) {
  const u = uploads || {};
  const tiles = [
    { label: "Total uploads", value: u.total },
    { label: "People who listed", value: u.uploaders, hint: "unique emails" },
    { label: "Last 7 days", value: u.last7 },
    { label: "Last 30 days", value: u.last30, hint: `${u.uploaders30 ?? 0} people` },
    { label: "Pending review", value: u.pending },
    { label: "Approved", value: u.published },
    { label: "Rejected", value: u.rejected },
    { label: "Live now", value: u.liveNow }
  ];
  const areaMax = Math.max(...(u.byArea || []).map((a) => a.uploads), 1);

  return (
    <DashboardWidget
      title="Uploads overview"
      subtitle={`Properties listed by people via “List your property” · ${u.rent ?? 0} for rent · ${u.sale ?? 0} for sale`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={dashStat}>
            <span className={dashStatValue}>{t.value ?? "—"}</span>
            <span className={dashStatLabel}>{t.label}</span>
            {t.hint ? <span className="block text-[10px] text-muted">{t.hint}</span> : null}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">Uploads per month</h3>
          <MonthlyBars monthly={u.monthly} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-heading">By sub-city</h3>
          {!u.byArea?.length ? (
            <p className={dashMuted}>No uploads yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {u.byArea.map((a) => (
                <li key={a.area} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 truncate text-brand-deep">{a.area}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${(a.uploads / areaMax) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right font-semibold text-brand-deep">{a.uploads}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-heading">Top uploaders</h3>
          {!u.topUploaders?.length ? (
            <p className={dashMuted}>No uploaders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={dashTable}>
                <thead>
                  <tr>
                    <th className={dashTableTh}>Person</th>
                    <th className={cn(dashTableTh, "text-right")}>Uploads</th>
                    <th className={cn(dashTableTh, "text-right")}>Approved</th>
                    <th className={dashTableTh}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {u.topUploaders.map((p) => (
                    <tr key={p.email}>
                      <td className={dashTableTd}>
                        <span className="block font-medium text-brand-deep">{p.name || "—"}</span>
                        <a href={`mailto:${p.email}`} className="block text-xs text-primary hover:underline">{p.email}</a>
                        {p.phone ? <span className="block text-xs text-muted">{p.phone}</span> : null}
                      </td>
                      <td className={cn(dashTableTd, "text-right font-semibold")}>{p.uploads}</td>
                      <td className={cn(dashTableTd, "text-right")}>{p.published}</td>
                      <td className={cn(dashTableTd, "whitespace-nowrap text-xs text-muted")}>{formatDate(p.last_upload)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-heading">Latest uploads</h3>
          {!u.recent?.length ? (
            <p className={dashMuted}>No uploads yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {u.recent.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    {r.status === "published" && (r.listing_ref || r.property_id) ? (
                      <Link to={`/property/${r.listing_ref || r.property_id}`} className="block truncate font-medium text-brand-deep hover:text-primary">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="block truncate font-medium text-brand-deep">{r.title}</span>
                    )}
                    <span className="block text-xs text-muted">
                      {r.listing_ref ? <span className="font-mono font-semibold">{r.listing_ref} · </span> : null}
                      {r.location_area || "Addis Ababa"} · {r.contact_name || r.contact_email} · {formatDate(r.created_at)}
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardWidget>
  );
}
