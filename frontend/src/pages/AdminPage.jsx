import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { Container, Section, Card, CardContent, Input, Button } from "../components/ui";
import SubmissionReviewCard from "../components/dashboard/SubmissionReviewCard";
import AdminUsersWidget from "../components/dashboard/AdminUsersWidget";

function AdminPage() {
  const [searchParams] = useSearchParams();
  const focusSubmissionId = searchParams.get("submission");
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

  useEffect(() => {
    if (!focusSubmissionId || !submissions.length) return;
    const el = document.getElementById(`submission-${focusSubmissionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-primary");
      const timer = window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 4000);
      return () => window.clearTimeout(timer);
    }
  }, [focusSubmissionId, submissions]);

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

  const assignJustPropertyToEpm = async () => {
    if (
      !window.confirm(
        "Assign all Just Property listings to property@epmglobal.com (EPM), mark them verified, and set source to EPM short name?"
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      const r = await api.post("/admin/assign-just-property-to-epm", {
        agencyName: "EPM Global",
        shortName: "EPMGlobal"
      });
      setMsg(
        `Assigned ${r.data.justPropertyAssigned ?? 0} Just Property listings to EPM. Owned: ${r.data.ownedActive ?? 0}, verified: ${r.data.verifiedActive ?? 0}.`
      );
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Assign Just Property to EPM failed.");
    } finally {
      setRunning(false);
    }
  };

  const repairJustPropertyImages = async () => {
    if (!window.confirm("Re-fetch photos for Just Property listings that have no images?")) return;
    setRunning(true);
    let fixed = 0;
    let failed = 0;
    let rounds = 0;
    try {
      // Process in batches until none remain (or max rounds).
      while (rounds < 20) {
        rounds += 1;
        const r = await api.post(
          "/admin/repair-just-property-images",
          { limit: 20, sleepMs: 600 },
          { timeout: 180000 }
        );
        fixed += Number(r.data.fixed || 0);
        failed += Number(r.data.failed || 0);
        const batchTotal = Number(r.data.total || 0);
        setMsg(`Image repair… fixed ${fixed}, failed ${failed} (batch ${rounds})`);
        if (batchTotal === 0) break;
      }
      setMsg(`Image repair done. Fixed ${fixed}, failed ${failed}.`);
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || `Image repair failed after fixing ${fixed}.`);
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

  const tableClass = "w-full text-sm border-collapse";
  const thClass = "border-b border-line px-3 py-2 text-left text-xs font-medium uppercase text-muted";
  const tdClass = "border-b border-line px-3 py-2";

  return (
    <Section>
      <Container>
        <h1 className="text-3xl font-bold text-heading">Admin dashboard</h1>
        {msg ? <p className="mt-4 text-sm text-success">{msg}</p> : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="text-sm"><strong>Total listings:</strong> {stats.total_active || 0}</CardContent></Card>
          <Card><CardContent className="text-sm"><strong>Sources:</strong> {stats.total_sources || 0}</CardContent></Card>
          <Card><CardContent className="text-sm"><strong>Last scrape:</strong> {stats.last_scraped || "—"}</CardContent></Card>
          <Card><CardContent className="text-sm"><strong>Pending submissions:</strong> {submissions.length}</CardContent></Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => runScraper(false)} disabled={running}>{running ? "Running…" : "Run scraper"}</Button>
          <Button variant="secondary" onClick={resetAndRescrape} disabled={running}>Reset crawled & full re-scrape</Button>
          <Button variant="secondary" onClick={assignJustPropertyToEpm} disabled={running}>
            Assign Just Property → EPM
          </Button>
          <Button variant="secondary" onClick={repairJustPropertyImages} disabled={running}>
            Repair Just Property images
          </Button>
          <Button variant="secondary" onClick={runMaintenance}>Apply 365-day rule</Button>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-heading">Pending listing submissions</h2>
        {submissions.length === 0 ? <p className="mt-2 text-muted">No pending submissions.</p> : null}
        <ul className="mt-4 space-y-3">
          {submissions.map((s) => (
            <SubmissionReviewCard
              key={s.id}
              submission={s}
              onPublish={publish}
              onReject={reject}
            />
          ))}
        </ul>

        <AdminUsersWidget />

        <h2 className="mt-10 text-xl font-semibold text-heading">Quick verify crawled listing</h2>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); verifyProperty(e.target.pid.value); }}>
          <Input name="pid" placeholder="property_id" required className="max-w-xs" />
          <Button type="submit">Mark verified</Button>
        </form>

        <h2 className="mt-10 text-xl font-semibold text-heading">Sources</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {sources.map((s) => <li key={s.id}>{s.name} — {s.base_url}</li>)}
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-heading">Scrape logs</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Status</th>
                <th className={thClass}>Started</th>
                <th className={thClass}>New</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>Off</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={tdClass}>{log.status}</td>
                  <td className={tdClass}>{String(log.started_at)}</td>
                  <td className={tdClass}>{log.properties_new}</td>
                  <td className={tdClass}>{log.properties_updated}</td>
                  <td className={tdClass}>{log.properties_deactivated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}

export default AdminPage;
