import { Link } from "react-router-dom";
import { Container, Section, Button, PageHero, SectionHeader } from "../components/ui";

const heroImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2000&q=80";

function initialsFromName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
      <PageHero
        image={heroImage}
        eyebrow="About Market Mizan"
        title="Clarity for every home search in Addis Ababa"
        subtitle="We bring together listings from trusted sources so you can explore real homes and neighbourhoods in one calm, modern experience — built for people who live and invest in Ethiopia's capital."
        action={<Button as={Link} to="/" size="lg">Browse listings</Button>}
      />

      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <SectionHeader eyebrow="Our story" title="Our mission" className="mb-0" />
              <p className="mt-4 text-muted leading-relaxed">
                Finding the right property should not mean juggling dozens of sites. Market Mizan aggregates listings so you
                spend less time searching and more time visiting places that truly fit your life.
              </p>
              <p className="mt-4 text-muted leading-relaxed">
                Whether you are buying your first apartment, upgrading for your family, or scouting opportunities as an
                investor — we aim to give you a clear picture of what is on the market today.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-heading">Why Addis Ababa</h3>
              <p className="mt-3 text-muted leading-relaxed">
                The city is growing fast — new neighbourhoods, new projects, new stories. We focus on Addis Ababa because
                depth matters: better filters, better context, and a product tuned to how people actually search here.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <section className="relative" aria-label="Addis Ababa cityscape">
        <img src={cityStrip} alt="Panoramic skyline of Addis Ababa" className="h-64 w-full object-cover sm:h-80" loading="lazy" />
        <Container className="absolute bottom-4 left-0 right-0">
          <span className="rounded-lg bg-brand-deep/80 px-4 py-2 text-sm text-white backdrop-blur-sm">Urban energy, mountain light — a city in motion.</span>
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

      <section className="bg-brand-deep py-12 text-white">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to find your place?</h2>
            <p className="mt-2 text-white/80">Search live listings, save time, and reach out when you are ready to take the next step.</p>
          </div>
          <Button as={Link} to="/contact" variant="whatsapp" size="lg">Contact us</Button>
        </Container>
      </section>

      <p className="py-6 text-center text-xs text-muted">
        Team photos are neutral placeholders (initials). Hero, city strip, and property gallery images are from{" "}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Unsplash</a>{" "}
        (<a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">license</a>).
      </p>
    </main>
  );
}
