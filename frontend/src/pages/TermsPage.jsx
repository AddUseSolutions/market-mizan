import { Container, Section } from "../components/ui";

function LegalLayout({ title, updated, children }) {
  return (
    <Section>
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-bold text-heading">{title}</h1>
        {updated ? <p className="mt-2 text-sm text-muted">{updated}</p> : null}
        <div className="mt-8 space-y-8 text-muted leading-relaxed">{children}</div>
      </Container>
    </Section>
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

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of use" updated="Last updated: April 2026">
      <LegalSection title="Agreement">
        <p>By accessing or using Market Mizan (mmizan.com), you agree to these terms. If you do not agree, please do not use the service.</p>
      </LegalSection>
      <LegalSection title="Service description">
        <p>Market Mizan aggregates publicly available property listings from third-party sources for information purposes. We do not guarantee completeness, accuracy, or availability of listings. Always verify details with the listing provider before making decisions.</p>
      </LegalSection>
      <LegalSection title="Accounts">
        <p>Where we offer accounts, you are responsible for keeping your credentials confidential and for all activity under your account. Notify us promptly of any unauthorised use.</p>
      </LegalSection>
      <LegalSection title="Acceptable use">
        <p>You must not misuse the site (e.g. scraping in violation of our rules, introducing malware, overloading systems, or using the service for unlawful purposes). We may suspend access if necessary.</p>
      </LegalSection>
      <LegalSection title="Disclaimer">
        <p>The service is provided "as is". To the extent permitted by law, we disclaim warranties and limit liability arising from your use of aggregated information or third-party content.</p>
      </LegalSection>
      <LegalSection title="Changes">
        <p>We may update these terms from time to time. Continued use after changes constitutes acceptance of the revised terms.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p><a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a></p>
      </LegalSection>
    </LegalLayout>
  );
}
