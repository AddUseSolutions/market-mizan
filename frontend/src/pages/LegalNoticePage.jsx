import { Container, Section, PageHero } from "../components/ui";
import { useLanguage } from "../context/LanguageContext";

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
  const { t } = useLanguage();

  return (
    <LegalLayout eyebrow={t("legalEyebrow")} title={t("legalNoticeTitle")} updated={t("legalNoticeLead")}>
      <LegalSection title={t("legalOperatorTitle")}>
        <p>
          {t("legalOperatorName")}
          <br />
          {t("legalOperatorAddress")}
        </p>
        <p>
          {t("legalContactLabel")}{" "}
          <a href="mailto:hello@mmizan.com" className="text-primary hover:underline">
            hello@mmizan.com
          </a>
        </p>
      </LegalSection>
      <LegalSection title={t("legalResponsibleTitle")}>
        <p>{t("legalResponsibleBody")}</p>
      </LegalSection>
      <LegalSection title={t("legalIpTitle")}>
        <p>{t("legalIpBody")}</p>
      </LegalSection>
    </LegalLayout>
  );
}
