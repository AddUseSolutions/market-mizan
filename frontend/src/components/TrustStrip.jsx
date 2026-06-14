import { useLanguage } from "../context/LanguageContext";
import { Container } from "./ui";

export default function TrustStrip() {
  const { t } = useLanguage();
  const items = [
    { icon: "🔍", title: t("trustCompare"), text: t("trustCompareSub") },
    { icon: "🛡️", title: t("trustSource"), text: t("trustSourceSub") },
    { icon: "✓", title: t("trustVerify"), text: t("trustVerifySub") }
  ];

  return (
    <section className="border-y border-line bg-surface/50 py-8" aria-label={t("trustSection")}>
      <Container>
        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="text-2xl" aria-hidden>{item.icon}</span>
              <div>
                <h3 className="font-semibold text-heading">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
