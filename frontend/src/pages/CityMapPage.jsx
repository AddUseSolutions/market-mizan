import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAdmin } from "../constants/roles";
import DashboardTabs from "../components/dashboard/DashboardTabs";
import ListingDistrictMap from "../components/dashboard/ListingDistrictMap";
import { Button, Container, Section, SectionHeader } from "../components/ui";

export default function CityMapPage() {
  const { user } = useAuth();

  if (!isAdmin(user)) {
    return (
      <Section>
        <Container>
          <p className="text-muted">The city map is in admin testing. It will open for premium members after that.</p>
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
          eyebrow="Admin preview"
          title="Addis Ababa listing map"
          subtitle="Every public listing that has a pin, coloured by sub-city. This view stays in admin until the premium plan is ready."
        />
        <DashboardTabs />
        <ListingDistrictMap />
      </Container>
    </Section>
  );
}
