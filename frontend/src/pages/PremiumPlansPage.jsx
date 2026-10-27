import { Link } from "react-router-dom";
import { Container, Section, PageHero, Button } from "../components/ui";

export default function PremiumPlansPage() {
  return (
    <main>
      <PageHero
        eyebrow="Premium"
        title="Boost your listing"
        subtitle="A Premium Plan puts your property in front of more buyers and tenants."
      />
      <Section className="pt-0">
        <Container className="max-w-3xl">
          <div className="space-y-6 text-muted leading-relaxed">
            <p>
              Every approved listing on Market Mizan is already live. A Premium Plan is an optional paid placement
              that increases visibility so more people see your property.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Higher visibility among search results</li>
              <li>Shown to more potential buyers and tenants</li>
              <li>Your listing stays verified</li>
            </ul>
            <p>
              Tell us the listing reference (MM…) and we will confirm the plan and payment with you before anything
              changes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button as={Link} to="/contact">
                Talk to us about Premium
              </Button>
              <Button as={Link} to="/my-listings" variant="secondary">
                Manage your listing
              </Button>
            </div>
            <p className="text-sm">
              Or email{" "}
              <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">
                hello@mmizan.com
              </a>
            </p>
          </div>
        </Container>
      </Section>
    </main>
  );
}
