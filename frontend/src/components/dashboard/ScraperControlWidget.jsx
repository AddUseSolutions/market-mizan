import { useState } from "react";
import api from "../../api";

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
    <section className="dash-widget dash-widget--scraper">
      <header className="dash-widget-header">
        <h2 className="dash-widget-title">Scraper control</h2>
        <p className="dash-widget-sub">Sync health &amp; manual runs</p>
      </header>

      <div className="dash-stat-row">
        <div className="dash-stat">
          <span className="dash-stat-value">{scraper?.syncUrlCount ?? "—"}</span>
          <span className="dash-stat-label">URLs in sync</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-value">{scraper?.errorsInLastRun ?? 0}</span>
          <span className="dash-stat-label">Errors (last run)</span>
        </div>
      </div>

      {last ? (
        <div className="dash-meta-block">
          <p>
            <strong>Last run:</strong> {last.status || "—"}
            {last.finished_at ? ` · ${String(last.finished_at).slice(0, 16).replace("T", " ")}` : ""}
          </p>
          <p className="dash-meta-muted">
            +{last.properties_new ?? 0} new · {last.properties_updated ?? 0} updated ·{" "}
            {last.properties_deactivated ?? 0} off
          </p>
          {last.error_message ? <p className="dash-error-text">{last.error_message}</p> : null}
        </div>
      ) : (
        <p className="dash-meta-muted">No scrape logs yet.</p>
      )}

      <div className="dash-widget-actions">
        <button type="button" onClick={() => runScraper(false)} disabled={running}>
          {running ? "Starting…" : "Run scraper"}
        </button>
        <button type="button" className="button upload-secondary" onClick={resetAndRescrape} disabled={running}>
          Reset &amp; full re-scrape
        </button>
      </div>

      {msg ? <p className="dash-inline-msg">{msg}</p> : null}

      {scraper?.recentLogs?.length ? (
        <table className="dash-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Started</th>
              <th>New</th>
            </tr>
          </thead>
          <tbody>
            {scraper.recentLogs.slice(0, 4).map((log) => (
              <tr key={log.id}>
                <td>{log.status}</td>
                <td>{String(log.started_at || "").slice(0, 10)}</td>
                <td>{log.properties_new}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
