import { useEffect, useState } from "react";
import api from "../api";

function AdminPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [sources, setSources] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/admin/scrape-logs").then((r) => setLogs(r.data)).catch(() => {});
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/sources").then((r) => setSources(r.data)).catch(() => {});
    api.get("/admin/submissions", { params: { status: "pending" } }).then((r) => setSubmissions(r.data)).catch(() => {});
  };

  useEffect(load, []);

  const runScraper = async (forceRescrape = false) => {
    setRunning(true);
    try {
      await api.post("/admin/run-scraper", { forceRescrape });
      setMsg(forceRescrape ? "Full re-scrape started (skip window = 0h)." : "Scraper started.");
      load();
    } catch {
      setMsg("Could not start scraper.");
    } finally {
      setRunning(false);
    }
  };

  const resetAndRescrape = async () => {
    if (!window.confirm("Mark all crawled listings for re-scrape and start scraper? Verified listings are kept.")) return;
    setRunning(true);
    try {
      const r = await api.post("/admin/reset-crawled-for-rescrape", { mode: "soft" });
      setMsg(`Reset OK: ${r.data.updated ?? r.data.crawledTotal} crawled listings queued. Starting scraper…`);
      await api.post("/admin/run-scraper", { forceRescrape: true });
      setMsg(`Done: ${r.data.updated ?? r.data.crawledTotal} listings queued. Full scraper run started — may take several hours.`);
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Reset or scraper failed.");
    } finally {
      setRunning(false);
    }
  };

  const runMaintenance = async () => {
    try {
      await api.post("/admin/maintenance");
      setMsg("Maintenance job completed (365-day rule applied).");
      load();
    } catch {
      setMsg("Maintenance failed.");
    }
  };

  const publish = async (id) => {
    const publisherType = window.prompt("Publisher type: broker or landlord", "landlord") || "landlord";
    const isPaid = window.confirm("Is this a paid listing?");
    try {
      const r = await api.post(`/admin/submissions/${id}/publish`, { publisherType, isPaid });
      setMsg(`Published as ${r.data.propertyId}`);
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Publish failed.");
    }
  };

  const reject = async (id) => {
    const reason = window.prompt("Rejection reason", "Does not meet guidelines");
    if (!reason) return;
    try {
      await api.post(`/admin/submissions/${id}/reject`, { reason });
      setMsg("Submission rejected.");
      load();
    } catch {
      setMsg("Reject failed.");
    }
  };

  const verifyProperty = async (propertyId) => {
    try {
      await api.post(`/admin/properties/${propertyId}/verify`, { publisherType: "broker", isPaid: false });
      setMsg(`Verified ${propertyId}`);
    } catch {
      setMsg("Verify failed.");
    }
  };

  return (
    <main className="container section-space admin-page">
      <h1>Admin dashboard</h1>
      {msg ? <p className="upload-success">{msg}</p> : null}
      <div className="stats admin-stats-grid">
        <div className="admin-stat">Total listings: {stats.total_active || 0}</div>
        <div className="admin-stat">Sources: {stats.total_sources || 0}</div>
        <div className="admin-stat">Last scrape: {stats.last_scraped || "—"}</div>
        <div className="admin-stat">Pending submissions: {submissions.length}</div>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={() => runScraper(false)} disabled={running}>{running ? "Running…" : "Run scraper"}</button>
        <button type="button" className="button upload-secondary" onClick={resetAndRescrape} disabled={running}>
          Reset crawled &amp; full re-scrape
        </button>
        <button type="button" className="button upload-secondary" onClick={runMaintenance}>Apply 365-day rule</button>
      </div>

      <h2>Pending listing submissions</h2>
      {submissions.length === 0 ? <p className="muted-inline">No pending submissions.</p> : null}
      <div className="admin-submissions">
        {submissions.map((s) => (
          <article key={s.id} className="admin-submission-card panel">
            <h3>{s.title}</h3>
            <p>{s.property_type} · {s.listing_mode} · ETB {Number(s.price).toLocaleString()}</p>
            <p>{s.location_area || s.location_city} · {s.bedrooms || s.rooms} bed · {s.contact_email}</p>
            <div className="upload-actions">
              <button type="button" onClick={() => publish(s.id)}>Publish & verify</button>
              <button type="button" className="button upload-secondary" onClick={() => reject(s.id)}>Reject</button>
            </div>
          </article>
        ))}
      </div>

      <h2>Quick verify crawled listing</h2>
      <form className="admin-verify-form" onSubmit={(e) => { e.preventDefault(); verifyProperty(e.target.pid.value); }}>
        <input name="pid" placeholder="property_id" required />
        <button type="submit">Mark verified</button>
      </form>

      <h2>Sources</h2>
      <ul className="source-list">
        {sources.map((s) => <li key={s.id}>{s.name} — {s.base_url}</li>)}
      </ul>

      <h2>Scrape logs</h2>
      <table className="table">
        <thead>
          <tr><th>Status</th><th>Started</th><th>New</th><th>Updated</th><th>Off</th></tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{log.status}</td>
              <td>{String(log.started_at)}</td>
              <td>{log.properties_new}</td>
              <td>{log.properties_updated}</td>
              <td>{log.properties_deactivated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default AdminPage;
