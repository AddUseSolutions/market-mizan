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

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <LegalLayout eyebrow={t("legalEyebrow")} title={t("termsTitle")} updated={t("termsUpdated")}>
      <LegalSection title={t("termsAgreementTitle")}>
        <p>{t("termsAgreementBody")}</p>
      </LegalSection>
      <LegalSection title={t("termsServiceTitle")}>
        <p>{t("termsServiceBody")}</p>
      </LegalSection>
      <LegalSection title={t("termsAccountsTitle")}>
        <p>{t("termsAccountsBody")}</p>
      </LegalSection>
      <LegalSection title={t("termsAcceptableTitle")}>
        <p>{t("termsAcceptableBody")}</p>
      </LegalSection>
      <LegalSection title={t("termsDisclaimerTitle")}>
        <p>{t("termsDisclaimerBody")}</p>
      </LegalSection>
      <LegalSection title={t("termsChangesTitle")}>
        <p>{t("termsChangesBody")}</p>
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
