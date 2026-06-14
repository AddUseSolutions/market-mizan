import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import HeroSearchCard from "./HeroSearchCard";
import {
  IconCloudUpload,
  IconHouse,
  IconKey,
  IconBuilding,
  IconChevronRight
} from "./icons/HeroIcons";

const QUICK_FILTER_ICONS = {
  quickFilter1: IconHouse,
  quickFilter2: IconKey,
  quickFilter3: IconBuilding
};

function HeroTitle({ title, lang }) {
  if (lang === "en" && title.toLowerCase().endsWith("property")) {
    const prefix = title.slice(0, -"property".length);
    return (
      <>
        {prefix}
        <span className="relative inline-block">
          property
          <span className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-gold" aria-hidden />
        </span>
      </>
    );
  }
  return (
    <span className="relative inline-block">
      {title}
      <span className="absolute -bottom-2 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-gold" aria-hidden />
    </span>
  );
}

export default function HomeHero({ quickFilters, onQuickFilter, onOpenMoreFilters }) {
  const { t, lang } = useLanguage();

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-home.jpg)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-hero-navy-deep/85 via-hero-navy/80 to-hero-navy-deep/90" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-[min(720px,90vh)] max-w-4xl flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-16">
        <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          <HeroTitle title={t("heroTitle")} lang={lang} />
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
          {t("heroSub")}
        </p>

        <Link
          to="/list-your-property"
          className="mt-6 inline-flex min-w-[240px] items-center justify-center gap-2.5 rounded-full border border-white/60 bg-hero-navy/50 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-hero-navy/70 sm:min-w-[280px] sm:text-base"
        >
          <IconCloudUpload className="text-gold" size={22} />
          {t("heroUploadCta")}
        </Link>

        <div className="mt-8 w-full flex justify-center">
          <HeroSearchCard onOpenMoreFilters={onOpenMoreFilters} />
        </div>

        <div className="mt-5 flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center" role="group" aria-label={t("popularSearches")}>
          {quickFilters.map((f) => {
            const Icon = QUICK_FILTER_ICONS[f.labelKey] || IconHouse;
            return (
              <button
                key={f.labelKey}
                type="button"
                onClick={() => onQuickFilter(f.params)}
                className="inline-flex w-full items-center justify-between gap-2 rounded-full bg-white px-4 py-2.5 text-left text-sm font-medium text-text shadow-sm transition-shadow hover:shadow-md sm:w-auto sm:justify-start"
              >
                <span className="flex items-center gap-2">
                  <Icon className="shrink-0 text-gold" size={18} />
                  {t(f.labelKey)}
                </span>
                <IconChevronRight className="shrink-0 text-gold" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
