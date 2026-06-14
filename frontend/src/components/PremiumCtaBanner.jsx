import { Link } from "react-router-dom";
import { IconArrowRight } from "./icons/HeroIcons";
import { Container, Section } from "./ui";

function BannerQuatrefoilPattern() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[min(40%,220px)] overflow-hidden opacity-[0.08]" aria-hidden>
      <svg className="h-full w-full text-gold" viewBox="0 0 200 200" fill="currentColor">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={40 + col * 60}
              cy={40 + row * 60}
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          ))
        )}
        <path d="M20 20h40v40H20zM70 20h40v40H70zM120 20h40v40h-40z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      </svg>
    </div>
  );
}

function BannerCurveAccent() {
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 h-full w-[min(45%,280px)] overflow-hidden opacity-20" aria-hidden>
      <svg className="h-full w-full text-gold" viewBox="0 0 280 160" fill="none" preserveAspectRatio="xMaxYMax meet">
        <path d="M280 160 C200 120 120 100 40 80" stroke="currentColor" strokeWidth="1.5" />
        <path d="M280 140 C190 110 100 90 20 70" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <path d="M280 120 C210 95 130 75 60 55" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
    </div>
  );
}

export default function PremiumCtaBanner({
  title = "Ready to find your place?",
  subtitle = "Search live listings, save time, and reach out when you are ready to take the next step.",
  ctaLabel = "Contact us",
  ctaTo = "/contact",
}) {
  return (
    <Section className="py-10 sm:py-12">
      <Container>
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-10 shadow-card sm:px-10 sm:py-12"
          style={{
            background: "radial-gradient(ellipse 80% 120% at 50% 50%, #3f56a6 0%, #252f55 55%, #1c2440 100%)"
          }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden />
          <BannerQuatrefoilPattern />
          <BannerCurveAccent />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{title}</h2>
              <p className="mt-3 text-base leading-relaxed text-white/85">{subtitle}</p>
            </div>
            <Link
              to={ctaTo}
              className="inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-lg border border-gold px-6 py-3 text-sm font-semibold text-gold shadow-[0_4px_24px_rgba(240,180,41,0.18)] transition-colors hover:bg-gold/10 sm:self-center"
            >
              {ctaLabel}
              <IconArrowRight className="text-gold" size={18} />
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
