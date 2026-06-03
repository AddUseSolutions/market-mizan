import { useLanguage } from "../context/LanguageContext";

export default function TrustStrip() {
  const { t } = useLanguage();
  const items = [
    { icon: "🔍", title: t("trustCompare"), text: t("trustCompareSub") },
    { icon: "🛡️", title: t("trustSource"), text: t("trustSourceSub") },
    { icon: "✓", title: t("trustVerify"), text: t("trustVerifySub") }
  ];

  return (
    <section className="trust-strip" aria-label={t("trustSection")}>
      <div className="container trust-strip-inner">
        {items.map((item) => (
          <div key={item.title} className="trust-strip-item">
            <span className="trust-strip-icon" aria-hidden>{item.icon}</span>
            <div>
              <h3 className="trust-strip-title">{item.title}</h3>
              <p className="trust-strip-text">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
