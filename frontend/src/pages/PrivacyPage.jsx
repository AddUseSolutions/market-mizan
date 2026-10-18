import { Container, Section, PageHero } from "../components/ui";
import { useLanguage } from "../context/LanguageContext";

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
  const { t } = useLanguage();

  return (
    <LegalLayout eyebrow={t("legalEyebrow")} title={t("privacyTitle")} updated={t("privacyUpdated")}>
      <LegalSection title={t("privacyWhoTitle")}>
        <p>{t("privacyWhoBody")}</p>
      </LegalSection>
      <LegalSection title={t("privacyDataTitle")}>
        <p>{t("privacyDataBody")}</p>
      </LegalSection>
      <LegalSection title={t("privacyUseTitle")}>
        <p>{t("privacyUseBody")}</p>
      </LegalSection>
      <LegalSection title={t("privacyThirdTitle")}>
        <p>{t("privacyThirdBody")}</p>
      </LegalSection>
      <LegalSection title={t("privacyRightsTitle")}>
        <p>
          {t("privacyRightsBody").split("hello@mmizan.com").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">
                  hello@mmizan.com
                </a>
              </span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      </LegalSection>
      <LegalSection title={t("footerContact")}>
        <p>
          <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">
            hello@mmizan.com
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
