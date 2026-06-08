import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { ROLES, hasAnyRole, isAdmin, normalizeRole } from "../constants/roles";
import ScraperControlWidget from "../components/dashboard/ScraperControlWidget";
import PendingSubmissionsWidget from "../components/dashboard/PendingSubmissionsWidget";
import HolisticLeadsWidget from "../components/dashboard/HolisticLeadsWidget";
import MarketIntelligenceWidget from "../components/dashboard/MarketIntelligenceWidget";
import InventoryStatsWidget from "../components/dashboard/InventoryStatsWidget";

const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER];

export default function DashboardPage() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get("/admin/dashboard-stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.response?.data?.message || "Could not load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showScraper = isAdmin(user);
  const showSubmissions = isAdmin(user);
  const showLeads = hasAnyRole(user, ROLES.ADMIN, ROLES.AGENCY_BROKER);
  const showMarket = hasAnyRole(user, ROLES.ADMIN, ROLES.PREMIUM_BUYER);
  const showInventory = isAdmin(user);

  const roleLabel = {
    [ROLES.ADMIN]: "Administrator",
    [ROLES.AGENCY_BROKER]: "Agency / Broker",
    [ROLES.PREMIUM_BUYER]: "Premium buyer"
  }[role] || role;

  return (
    <main className="container section-space dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""} — {roleLabel}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="button upload-secondary" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {isAdmin(user) ? (
            <Link to="/admin" className="button upload-secondary dashboard-legacy-link">
              Legacy admin
            </Link>
          ) : null}
        </div>
      </header>

      {stats?.cachedAt ? (
        <p className="dashboard-cache-note">
          Stats cached at {String(stats.cachedAt).slice(0, 19).replace("T", " ")} UTC (10 min TTL)
        </p>
      ) : null}

      {error ? <p className="contact-form-error">{error}</p> : null}
      {loading && !stats ? <p className="dash-meta-muted">Loading dashboard…</p> : null}

      <div className="dashboard-grid">
        {showInventory && stats?.inventory ? (
          <InventoryStatsWidget inventory={stats.inventory} />
        ) : null}

        {showScraper && stats?.scraper ? (
          <ScraperControlWidget scraper={stats.scraper} onRefresh={load} />
        ) : null}

        {showMarket && stats?.market ? (
          <MarketIntelligenceWidget market={stats.market} />
        ) : null}

        {showSubmissions && stats?.moderation ? (
          <PendingSubmissionsWidget moderation={stats.moderation} onRefresh={load} />
        ) : null}

        {showLeads ? (
          <HolisticLeadsWidget
            leads={stats?.leads}
            title={isAdmin(user) ? "Holistic service leads" : "Leads for your listings"}
          />
        ) : null}
      </div>

      {!loading && !error && !showScraper && !showSubmissions && !showLeads && !showMarket && !showInventory ? (
        <p className="dash-meta-muted">
          No dashboard widgets are available for your role ({role}). Allowed roles:{" "}
          {DASHBOARD_ROLES.join(", ")}.
        </p>
      ) : null}
    </main>
  );
}
