import { Link } from "react-router-dom";
import { IconArrowRight } from "./icons/HeroIcons";
import { Container, Section } from "./ui";

export default function PremiumCtaBanner({
  title = "Ready to find your place?",
  subtitle = "Search live listings, save time, and reach out when you are ready to take the next step.",
  ctaLabel = "Contact us",
  ctaTo = "/contact",
}) {
  return (
    <Section className="py-10 sm:py-12">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-10 shadow-soft sm:px-10 sm:py-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden />

          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-heading text-2xl font-bold text-heading sm:text-3xl">{title}</h2>
              <p className="mt-3 text-base leading-relaxed text-muted">{subtitle}</p>
            </div>
            <Link
              to={ctaTo}
              className="inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:self-center"
            >
              {ctaLabel}
              <IconArrowRight className="text-white" size={18} />
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
