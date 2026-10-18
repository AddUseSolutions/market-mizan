import { useAuth } from "../context/AuthContext";
import { hasAnyRole, isAdmin, ROLES } from "../constants/roles";
import MarketIntelligenceWidget from "../components/dashboard/MarketIntelligenceWidget";
import DashboardTabs from "../components/dashboard/DashboardTabs";
import { Container, Section, SectionHeader } from "../components/ui";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export default function MarketIntelligencePage() {
  const { user } = useAuth();
  const allowed = hasAnyRole(user, ROLES.ADMIN, ROLES.PREMIUM_BUYER);

  if (!allowed) {
    return (
      <Section>
        <Container>
          <p className="text-muted">Market intelligence is available for admins and premium buyers.</p>
          <Button as={Link} to="/dashboard" variant="secondary" className="mt-4">
            Back to dashboard
          </Button>
        </Container>
      </Section>
    );
  }

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="Market"
          title="Market intelligence"
          subtitle="Monthly price index by sub-city — Apt/House × Rent/Sale, top 5 by listings, MoM % deltas"
        />
        {isAdmin(user) ? <DashboardTabs /> : null}
        <MarketIntelligenceWidget standalone />
      </Container>
    </Section>
  );
}
