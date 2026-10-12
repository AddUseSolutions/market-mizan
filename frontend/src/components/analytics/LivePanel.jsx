import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { DashboardWidget, dashMuted, dashTable, dashTableTh, dashTableTd } from "../dashboard/DashboardWidget";
import { MiniBars } from "./AnalyticsCharts";
import { EVENT_LABELS, bucketLabel, formatDuration, formatNumber, pageLabel, timeAgo } from "./analyticsFormat";

const POLL_MS = 15000;
const DEVICE_ICON = { mobile: "📱", tablet: "📲", desktop: "🖥️" };

function lastThirtyMinutes(perMinute) {
  const byMinute = new Map((perMinute || []).map((p) => [Math.round(new Date(p.t).getTime() / 60e3), p.sessions]));
  const now = Math.floor(Date.now() / 60e3);
  return Array.from({ length: 30 }, (_, i) => {
    const m = now - 29 + i;
    return { t: new Date(m * 60e3).toISOString(), sessions: byMinute.get(m) || 0 };
  });
}

function PathLink({ path }) {
  if (!path) return <span className="text-muted">—</span>;
  return (
    <Link to={path} className="text-primary hover:underline" title={path}>
      {pageLabel(path)}
    </Link>
  );
}

export default function LivePanel() {
  const [live, setLive] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    return api
      .get("/admin/analytics/live")
      .then((r) => {
        setLive(r.data);
        setError("");
      })
      .catch((e) => setError(e.response?.data?.message || "Live data unavailable."));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const minutes = lastThirtyMinutes(live?.perMinute);

  return (
    <DashboardWidget title="Live right now" subtitle="Visitors active in the last 5 minutes · refreshes every 15 seconds">
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-line bg-bg p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            Active visitors
          </p>
          <p className="mt-2 text-5xl font-semibold tabular-nums text-heading">{live ? formatNumber(live.activeVisitors) : "…"}</p>
          <p className="mt-1 text-xs text-muted">
            {live ? `${formatNumber(live.last24h.visitors)} visitors in the last 24 h` : ""}
          </p>
          <div className="mt-4">
            <MiniBars
              points={minutes}
              valueKey="sessions"
              labelFor={(p) => `${bucketLabel(p.t, "minute")} · ${p.sessions} active`}
            />
            <p className="mt-1 flex justify-between text-[10px] text-muted">
              <span>30 min ago</span>
              <span>now</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-heading">Who is on the site</h3>
            {live?.sessions?.length ? (
              <div className="max-h-72 overflow-auto">
                <table className={dashTable}>
                  <thead>
                    <tr>
                      <th className={dashTableTh}>Visitor</th>
                      <th className={dashTableTh}>Current page</th>
                      <th className={dashTableTh}>Came from</th>
                      <th className={dashTableTh}>Pages</th>
                      <th className={dashTableTh}>On site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.sessions.map((s) => (
                      <tr key={s.id}>
                        <td className={dashTableTd}>
                          <span title={`${s.device} · ${s.browser} · ${s.os}`}>{DEVICE_ICON[s.device] || "•"}</span>{" "}
                          <span className="text-heading">{s.country || "Unknown"}</span>
                          {s.hasLead ? (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">Lead</span>
                          ) : null}
                        </td>
                        <td className={`${dashTableTd} max-w-[220px] truncate`}>
                          <PathLink path={s.currentPath} />
                        </td>
                        <td className={dashTableTd}>
                          {s.source || "Direct"}
                          {s.campaign ? <span className="block text-[11px] text-muted">{s.campaign}</span> : null}
                        </td>
                        <td className={`${dashTableTd} tabular-nums`}>{s.pageViews}</td>
                        <td className={`${dashTableTd} tabular-nums text-muted`}>
                          {formatDuration((new Date(s.lastSeen) - new Date(s.startedAt)) / 1000)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={dashMuted}>{live ? "Nobody is on the site right now." : "Loading…"}</p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-heading">Latest activity</h3>
            {live?.recent?.length ? (
              <ul className="max-h-64 space-y-1 overflow-auto text-sm">
                {live.recent.map((r, i) => (
                  <li key={`${r.at}-${i}`} className="flex items-baseline gap-2 border-b border-line/60 py-1">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-muted">{timeAgo(r.at)}</span>
                    <span className="shrink-0 font-medium text-heading">{EVENT_LABELS[r.event] || r.event}</span>
                    <span className="min-w-0 truncate text-muted">
                      {r.label ? `“${r.label}” · ` : ""}
                      {pageLabel(r.path)}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {DEVICE_ICON[r.device] || ""} {r.country || ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={dashMuted}>{live ? "No activity in the last 30 minutes." : "Loading…"}</p>
            )}
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
