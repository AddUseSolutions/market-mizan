import { Container, Section, PageHero } from "../components/ui";

function LegalLayout({ eyebrow, title, updated, children }) {
  return (
    <main>
      <PageHero compact eyebrow={eyebrow} title={title} subtitle={updated} />
      <Section className="pt-0">
        <Container className="max-w-3xl">
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

export default function LegalNoticePage() {
  return (
    <LegalLayout eyebrow="Legal" title="Legal notice (Imprint)" updated="Information pursuant to applicable transparency rules.">
      <LegalSection title="Operator">
        <p>Market Mizan<br />Addis Ababa, Ethiopia</p>
        <p>Contact: <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">hello@mmizan.com</a></p>
        <p className="text-sm italic">Please replace the above with your full legal entity name, registered address, and registration details where required by law.</p>
      </LegalSection>
      <LegalSection title="Responsible for content">
        <p>The operator named above is responsible for own content on these pages under applicable law. Liability for links to third-party websites is limited as provided by law; we do not control external sites.</p>
      </LegalSection>
      <LegalSection title="Intellectual property">
        <p>Texts, graphics, and branding on Market Mizan are protected where applicable. Listing data may originate from third parties; respective rights remain with the original sources.</p>
      </LegalSection>
    </LegalLayout>
  );
}
