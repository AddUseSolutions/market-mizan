import { useEffect, useState } from "react";
import api from "../api";

function AdminPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [sources, setSources] = useState([]);
  const [running, setRunning] = useState(false);

  const load = () => {
    api.get("/scrape-logs").then((r) => setLogs(r.data)).catch(() => {});
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/sources").then((r) => setSources(r.data)).catch(() => {});
  };

  useEffect(load, []);

  const runScraper = async () => {
    setRunning(true);
    try {
      await api.post("/admin/run-scraper");
      alert("Scraper gestartet.");
      load();
    } catch {
      alert("Fehler beim Start.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="container section-space">
      <h1>Admin</h1>
      <div className="stats">
        <div>Total listings: {stats.total_active || 0}</div>
        <div>Active sources: {stats.total_sources || 0}</div>
        <div>Last update: {stats.last_scraped || "-"}</div>
      </div>
      <button onClick={runScraper} disabled={running}>{running ? "Running..." : "Run scraper now"}</button>

      <h2>Sources</h2>
      <ul className="source-list">
        {sources.map((s) => <li key={s.id}>{s.name} - {s.base_url} - {s.is_active ? "active" : "inactive"}</li>)}
      </ul>

      <h2>Scrape logs</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Started</th>
            <th>New</th>
            <th>Updated</th>
            <th>Deactivated</th>
          </tr>
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
