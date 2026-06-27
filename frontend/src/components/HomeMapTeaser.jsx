import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { IconMap } from "./icons/HeroIcons";

export default function HomeMapTeaser() {
  const { t } = useLanguage();
  return (
    <section className="border-y border-line bg-brand-muted/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconMap size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-brand-deep">{t("mapTeaserTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("mapTeaserLead")}</p>
          </div>
        </div>
        <Link
          to="/neighborhoods"
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          {t("mapTeaserCta")}
        </Link>
      </div>
    </section>
  );
}
