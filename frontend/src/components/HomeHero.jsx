import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import HeroSearchCard from "./HeroSearchCard";
import {
  IconCloudUpload,
  IconHouse,
  IconBuilding,
  IconBed,
  IconChevronRight
} from "./icons/HeroIcons";

const QUICK_FILTER_ICONS = {
  quickFilter1: IconBuilding,
  quickFilter2: IconBed,
  quickFilter3: IconHouse,
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
      <div className="absolute inset-0 bg-gradient-to-b from-brand-deep/90 via-brand-deep/75 to-brand-deep/95" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-0 max-w-4xl flex-col items-center justify-center px-4 py-10 pb-6 text-center sm:px-6 sm:py-14">
        <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          <HeroTitle title={t("heroTitle")} lang={lang} />
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
          {t("heroSub")}
        </p>

        <Link
          to="/list-your-property"
          className="mt-6 inline-flex min-w-[240px] items-center justify-center gap-2.5 rounded-full border border-gold/60 bg-brand-deep/60 px-8 py-3.5 text-sm font-semibold text-gold backdrop-blur-sm transition-colors hover:border-gold hover:bg-brand-deep/80 sm:min-w-[280px] sm:text-base"
        >
          <IconCloudUpload className="text-gold" size={22} />
          {t("heroUploadCta")}
        </Link>

        <div className="mt-6 w-full flex justify-center px-0 sm:mt-8">
          <HeroSearchCard onOpenMoreFilters={onOpenMoreFilters} />
        </div>

        <div
          className="mt-5 flex w-full max-w-2xl flex-col gap-2 pb-20 sm:flex-row sm:flex-wrap sm:justify-center sm:pb-24 md:pb-28"
          role="group"
          aria-label={t("popularSearches")}
        >
          {quickFilters.map((f) => {
            const Icon = QUICK_FILTER_ICONS[f.labelKey] || IconHouse;
            return (
              <button
                key={f.labelKey}
                type="button"
                onClick={() => onQuickFilter(f.params)}
                className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-[#DDE7F5] bg-white px-4 py-2.5 text-left text-sm font-medium text-brand-deep shadow-soft transition-shadow hover:shadow-card sm:w-auto sm:justify-start"
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
