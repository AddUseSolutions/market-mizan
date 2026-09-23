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
          <span className="absolute -bottom-1 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-primary" aria-hidden />
        </span>
      </>
    );
  }
  return (
    <span className="relative inline-block">
      {title}
      <span className="absolute -bottom-2 left-1/2 h-0.5 w-16 -translate-x-1/2 rounded-full bg-primary" aria-hidden />
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/65" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-0 max-w-4xl flex-col items-center justify-center px-4 py-6 pb-4 text-center sm:px-6 sm:py-8">
        <h1 className="max-w-3xl font-heading text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.25rem] lg:leading-tight">
          <HeroTitle title={t("heroTitle")} lang={lang} />
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
          {t("heroSub")}
        </p>

        <Link
          to="/list-your-property"
          className="mt-4 inline-flex min-w-[200px] items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-white/20 sm:min-w-[240px]"
        >
          <IconCloudUpload size={18} />
          {t("heroUploadCta")}
        </Link>

        <div className="mt-4 w-full flex justify-center px-0 sm:mt-5">
          <HeroSearchCard onOpenMoreFilters={onOpenMoreFilters} />
        </div>

        <div
          className="mt-3 flex w-full max-w-xl flex-col gap-1.5 pb-10 sm:flex-row sm:flex-wrap sm:justify-center sm:pb-12 md:pb-14"
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
                className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-left text-sm font-medium text-brand-deep shadow-soft transition-shadow hover:border-primary hover:shadow-card sm:w-auto sm:justify-start"
              >
                <span className="flex items-center gap-2">
                  <Icon className="shrink-0 text-primary" size={16} />
                  {t(f.labelKey)}
                </span>
                <IconChevronRight className="shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
