import { useState } from "react";
import api from "../../api";
import { Button } from "../ui";
import { DashboardWidget, dashStat, dashStatValue, dashStatLabel, dashMuted, dashTable, dashTableTh, dashTableTd } from "./DashboardWidget";

export default function ScraperControlWidget({ scraper, onRefresh }) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const last = scraper?.lastRun;

  async function runScraper(forceRescrape = false) {
    setRunning(true);
    setMsg("");
    try {
      await api.post("/admin/run-scraper", { forceRescrape });
      setMsg(forceRescrape ? "Full re-scrape started." : "Scraper started.");
      onRefresh?.();
    } catch {
      setMsg("Could not start scraper.");
    } finally {
      setRunning(false);
    }
  }

  async function resetAndRescrape() {
    if (!window.confirm("Mark all crawled listings for re-scrape and start scraper?")) return;
    setRunning(true);
    setMsg("");
    try {
      const r = await api.post("/admin/reset-crawled-for-rescrape", { mode: "soft" });
      await api.post("/admin/run-scraper", { forceRescrape: true });
      setMsg(`Queued ${r.data.updated ?? r.data.crawledTotal ?? 0} listings for re-scrape.`);
      onRefresh?.();
    } catch (e) {
      setMsg(e.response?.data?.message || "Reset failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <DashboardWidget title="Scraper control" subtitle="Sync health & manual runs">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={dashStat}>
          <span className={dashStatValue}>{scraper?.syncUrlCount ?? "—"}</span>
          <span className={dashStatLabel}>URLs in sync</span>
        </div>
        <div className={dashStat}>
          <span className={dashStatValue}>{scraper?.errorsInLastRun ?? 0}</span>
          <span className={dashStatLabel}>Errors (last run)</span>
        </div>
      </div>

      {last ? (
        <div className="mb-4 text-sm">
          <p><strong>Last run:</strong> {last.status || "—"}{last.finished_at ? ` · ${String(last.finished_at).slice(0, 16).replace("T", " ")}` : ""}</p>
          <p className={dashMuted}>+{last.properties_new ?? 0} new · {last.properties_updated ?? 0} updated · {last.properties_deactivated ?? 0} off</p>
          {last.error_message ? <p className="text-sm text-destructive">{last.error_message}</p> : null}
        </div>
      ) : (
        <p className={`mb-4 ${dashMuted}`}>No scrape logs yet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runScraper(false)} disabled={running}>{running ? "Starting…" : "Run scraper"}</Button>
        <Button variant="secondary" onClick={resetAndRescrape} disabled={running}>Reset & full re-scrape</Button>
      </div>

      {msg ? <p className="mt-3 text-sm text-success">{msg}</p> : null}

      {scraper?.recentLogs?.length ? (
        <table className={`mt-4 ${dashTable}`}>
          <thead>
            <tr>
              <th className={dashTableTh}>Status</th>
              <th className={dashTableTh}>Started</th>
              <th className={dashTableTh}>New</th>
            </tr>
          </thead>
          <tbody>
            {scraper.recentLogs.slice(0, 4).map((log) => (
              <tr key={log.id}>
                <td className={dashTableTd}>{log.status}</td>
                <td className={dashTableTd}>{String(log.started_at || "").slice(0, 10)}</td>
                <td className={dashTableTd}>{log.properties_new}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </DashboardWidget>
  );
}
