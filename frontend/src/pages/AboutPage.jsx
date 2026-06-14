import { Link } from "react-router-dom";
import { IconArrowRight, IconBuilding } from "../components/icons/HeroIcons";
import { Container, Section, SectionHeader, Eyebrow } from "../components/ui";
import PremiumCtaBanner from "../components/PremiumCtaBanner";

const heroImage =
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=80";

function initialsFromName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AboutWavePattern() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[min(28vw,180px)] overflow-hidden opacity-[0.14]" aria-hidden>
      <svg className="h-full w-full text-gold" viewBox="0 0 120 400" preserveAspectRatio="none" fill="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M0 ${40 + i * 72} Q 60 ${20 + i * 72} 120 ${55 + i * 72} T 120 ${90 + i * 72}`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}

const team = [
  { name: "Sara Bekele", role: "Product & partnerships", bio: "Focused on connecting buyers and trusted listing sources across Addis Ababa." },
  { name: "Daniel Tesfaye", role: "Engineering", bio: "Builds the platform that keeps search fast, clear, and reliable." },
  { name: "Meron Alemayehu", role: "Operations", bio: "Makes sure listings stay fresh and support reaches users when they need it." }
];

const propertyShowcase = [
  { src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80", alt: "Modern home exterior with pool at dusk" },
  { src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80", alt: "Bright living space with large windows" },
  { src: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80", alt: "Contemporary house facade and garden" },
  { src: "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=900&q=80", alt: "Minimal interior with staircase" },
  { src: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=80", alt: "Luxury living room with city view" },
  { src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80", alt: "Architectural home with wooden accents" }
];

const cityStrip =
  "https://images.unsplash.com/photo-1756723131979-4137c792bf5a?auto=format&fit=crop&w=1800&q=80";

export default function AboutPage() {
  return (
    <main>
      <section className="relative min-h-[min(560px,75vh)] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/90 via-brand-deep/50 to-brand-deep/30" aria-hidden />

        <Container className="relative z-10 flex min-h-[min(560px,75vh)] items-center py-14 sm:py-16">
          <div className="max-w-xl rounded-2xl border-l-[3px] border-t-[3px] border-gold bg-brand-deep/88 p-8 shadow-card backdrop-blur-sm sm:p-10">
            <Eyebrow>About Market Mizan</Eyebrow>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.5rem]">
              Clarity for every home search in Addis Ababa
            </h1>
            <p className="mt-4 leading-relaxed text-white/85">
              We bring together listings from trusted sources so you can explore real homes and neighbourhoods in one calm,
              modern experience — built for people who live and invest in Ethiopia&apos;s capital.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2.5 rounded-lg border border-gold bg-brand-deep/50 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:border-gold/80 hover:bg-brand-deep/70"
            >
              Browse listings
              <IconArrowRight className="text-gold" size={18} />
            </Link>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-brand-muted/40 py-14 sm:py-16">
        <AboutWavePattern />
        <Container className="relative">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <Eyebrow>Our story</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">Our mission</h2>
              <p className="mt-5 leading-relaxed text-muted">
                Finding the right property should not mean juggling dozens of sites. Market Mizan aggregates listings so you
                spend less time searching and more time visiting places that truly fit your life.
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                Whether you are buying your first apartment, upgrading for your family, or scouting opportunities as an
                investor — we aim to give you a clear picture of what is on the market today.
              </p>
            </div>

            <article className="rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/15">
                  <IconBuilding className="text-gold" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Why Addis Ababa</h3>
                  <p className="mt-3 leading-relaxed text-muted">
                    The city is growing fast — new neighbourhoods, new projects, new stories. We focus on Addis Ababa because
                    depth matters: better filters, better context, and a product tuned to how people actually search here.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section className="relative" aria-label="Addis Ababa cityscape">
        <img src={cityStrip} alt="Panoramic skyline of Addis Ababa" className="h-64 w-full object-cover sm:h-80" loading="lazy" />
        <Container className="absolute bottom-4 left-0 right-0">
          <span className="rounded-lg border border-gold/30 bg-brand-deep/85 px-4 py-2 text-sm text-white backdrop-blur-sm">
            Urban energy, mountain light — a city in motion.
          </span>
        </Container>
      </section>

      <Section>
        <Container>
          <SectionHeader
            eyebrow="The team"
            title="People behind Market Mizan"
            subtitle="A small team obsessed with trustworthy data, thoughtful design, and respectful support."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            {team.map((member) => (
              <article key={member.name} className="rounded-xl border border-line bg-surface p-5 shadow-soft text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {initialsFromName(member.name)}
                </div>
                <h3 className="mt-4 font-semibold text-heading">{member.name}</h3>
                <p className="text-sm font-medium text-gold-dark">{member.role}</p>
                <p className="mt-2 text-sm text-muted">{member.bio}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-brand-muted/50">
        <Container>
          <SectionHeader
            eyebrow="Inspiration"
            title="Homes that inspire us"
            subtitle="A glimpse of architecture and interiors — the kind of spaces our users explore every day. (Illustrative imagery; actual listings appear in search.)"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {propertyShowcase.map((item) => (
              <figure key={item.src} className="overflow-hidden rounded-xl">
                <img src={item.src} alt={item.alt} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105" />
              </figure>
            ))}
          </div>
        </Container>
      </Section>

      <PremiumCtaBanner />

      <p className="py-6 text-center text-xs text-muted">
        Team photos are neutral placeholders (initials). Hero, city strip, and property gallery images are from{" "}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Unsplash</a>{" "}
        (<a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">license</a>).
      </p>
    </main>
  );
}
