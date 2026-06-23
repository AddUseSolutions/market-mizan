import { useLanguage } from "../context/LanguageContext";
import { IconSearch, IconBuilding } from "./icons/HeroIcons";
import { Container, Eyebrow } from "./ui";

function IconShield({ className = "" }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 20 6v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function TrustStrip() {
  const { t } = useLanguage();
  const items = [
    { icon: IconSearch, title: t("trustCompare"), text: t("trustCompareSub") },
    { icon: IconBuilding, title: t("trustSource"), text: t("trustSourceSub") },
    { icon: IconShield, title: t("trustVerify"), text: t("trustVerifySub") }
  ];

  return (
    <section className="border-y border-line bg-brand-muted/40 py-10" aria-label={t("trustSection")}>
      <Container>
        <Eyebrow className="mb-6 text-center sm:text-left">{t("trustSection")}</Eyebrow>
        <div className="grid gap-8 sm:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Icon className="icon-accent" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-heading">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
