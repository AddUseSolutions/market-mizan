export default function LegalNoticePage() {
  return (
    <main className="container section-space legal-page">
      <h1>Legal notice (Imprint)</h1>
      <p className="legal-updated">Information pursuant to applicable transparency rules.</p>

      <section className="legal-section">
        <h2>Operator</h2>
        <p>
          Market Mizan
          <br />
          Addis Ababa, Ethiopia
        </p>
        <p>
          Contact: <a href="mailto:hello@mmizan.com">hello@mmizan.com</a>
        </p>
        <p className="legal-note">
          Please replace the above with your full legal entity name, registered address, and registration details where
          required by law.
        </p>
      </section>

      <section className="legal-section">
        <h2>Responsible for content</h2>
        <p>
          The operator named above is responsible for own content on these pages under applicable law. Liability for links to
          third-party websites is limited as provided by law; we do not control external sites.
        </p>
      </section>

      <section className="legal-section">
        <h2>Intellectual property</h2>
        <p>
          Texts, graphics, and branding on Market Mizan are protected where applicable. Listing data may originate from third
          parties; respective rights remain with the original sources.
        </p>
      </section>
    </main>
  );
}
