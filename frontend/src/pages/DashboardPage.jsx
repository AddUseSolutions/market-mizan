import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { ROLES, hasAnyRole, isAdmin, normalizeRole } from "../constants/roles";
import ScraperControlWidget from "../components/dashboard/ScraperControlWidget";
import PendingSubmissionsWidget from "../components/dashboard/PendingSubmissionsWidget";
import HolisticLeadsWidget from "../components/dashboard/HolisticLeadsWidget";
import MarketIntelligenceWidget from "../components/dashboard/MarketIntelligenceWidget";
import BrokerDashboardWidget from "../components/dashboard/BrokerDashboardWidget";
import InventoryStatsWidget from "../components/dashboard/InventoryStatsWidget";
import { Container, Section, Button, SectionHeader } from "../components/ui";

const DASHBOARD_ROLES = [ROLES.ADMIN, ROLES.AGENCY_BROKER, ROLES.PREMIUM_BUYER, ROLES.PRIVATE_LANDLORD];

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
  const showBroker = hasAnyRole(user, ROLES.AGENCY_BROKER) && !isAdmin(user);
  const showInventory = isAdmin(user);

  const roleLabel = {
    [ROLES.ADMIN]: "Administrator",
    [ROLES.AGENCY_BROKER]: "Agency / Broker",
    [ROLES.PREMIUM_BUYER]: "Premium buyer",
    [ROLES.PRIVATE_LANDLORD]: "Private landlord"
  }[role] || role;

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="Dashboard"
          title="Dashboard"
          subtitle={`Welcome back${user?.firstName ? `, ${user.firstName}` : ""} — ${roleLabel}`}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={load} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
              {isAdmin(user) ? (
                <Button as={Link} to="/admin" variant="secondary">Legacy admin</Button>
              ) : null}
            </div>
          }
        />

        {stats?.cachedAt ? (
          <p className="mb-4 text-xs text-muted">
            Stats cached at {String(stats.cachedAt).slice(0, 19).replace("T", " ")} UTC (10 min TTL)
          </p>
        ) : null}

        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
        {loading && !stats ? <p className="text-muted">Loading dashboard…</p> : null}

        {showBroker ? <BrokerDashboardWidget /> : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {showInventory && stats?.inventory ? <InventoryStatsWidget inventory={stats.inventory} /> : null}
          {showScraper && stats?.scraper ? <ScraperControlWidget scraper={stats.scraper} onRefresh={load} /> : null}
          {showMarket && stats?.market ? <MarketIntelligenceWidget market={stats.market} /> : null}
          {showSubmissions && stats?.moderation ? <PendingSubmissionsWidget moderation={stats.moderation} onRefresh={load} /> : null}
          {showLeads ? (
            <HolisticLeadsWidget
              leads={stats?.leads}
              title={isAdmin(user) ? "Holistic service leads" : "Leads for your listings"}
            />
          ) : null}
        </div>

        {!loading && !error && !showBroker && !showScraper && !showSubmissions && !showLeads && !showMarket && !showInventory ? (
          <p className="mt-6 text-muted">
            No dashboard widgets are available for your role ({role}). Allowed roles: {DASHBOARD_ROLES.join(", ")}.
          </p>
        ) : null}
      </Container>
    </Section>
  );
}
