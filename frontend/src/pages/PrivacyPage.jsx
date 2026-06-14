import { Container, Section, PageHero } from "../components/ui";

function LegalLayout({ eyebrow, title, updated, children }) {
  return (
    <main>
      <PageHero compact eyebrow={eyebrow} title={title} subtitle={updated} />
      <Section className="pt-0">
        <Container className="max-w-3xl prose-headings:text-heading">
          <div className="space-y-8 text-muted leading-relaxed">{children}</div>
        </Container>
      </Section>
    </main>
  );
}

function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-heading">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy policy" updated="Last updated: April 2026">
      <LegalSection title="Who we are">
        <p>Market Mizan ("we", "us") operates the website mmizan.com and related services. This page explains how we handle personal data when you use our site.</p>
      </LegalSection>
      <LegalSection title="Data we collect">
        <p>Depending on how you use Market Mizan, we may process: account details (e.g. name, email) if you register; messages you send via contact forms; and technical data such as IP address, browser type, and usage logs required to run and secure the service.</p>
      </LegalSection>
      <LegalSection title="How we use data">
        <p>We use data to provide and improve the platform, respond to enquiries, authenticate users where applicable, and meet legal obligations. We do not sell your personal data.</p>
      </LegalSection>
      <LegalSection title="Third parties">
        <p>We may use hosting, analytics, or authentication providers (for example sign-in with Google). Those providers process data under their own terms and only as needed to deliver the service.</p>
      </LegalSection>
      <LegalSection title="Your rights">
        <p>Where applicable law grants you rights (access, correction, deletion, objection, portability), you may contact us at <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a>. We will respond within a reasonable time.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Questions about privacy: <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a></p>
      </LegalSection>
    </LegalLayout>
  );
}
