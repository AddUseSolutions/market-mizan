import { Link } from "react-router-dom";

const heroImage =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2000&q=80";

const team = [
  {
    name: "Sara Bekele",
    role: "Product & partnerships",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=750&q=80",
    bio: "Focused on connecting buyers and trusted listing sources across Addis Ababa."
  },
  {
    name: "Daniel Tesfaye",
    role: "Engineering",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=750&q=80",
    bio: "Builds the platform that keeps search fast, clear, and reliable."
  },
  {
    name: "Meron Alemayehu",
    role: "Operations",
    image:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&h=750&q=80",
    bio: "Makes sure listings stay fresh and support reaches users when they need it."
  }
];

const propertyShowcase = [
  {
    src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    alt: "Modern home exterior with pool at dusk"
  },
  {
    src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
    alt: "Bright living space with large windows"
  },
  {
    src: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80",
    alt: "Contemporary house facade and garden"
  },
  {
    src: "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=900&q=80",
    alt: "Minimal interior with staircase"
  },
  {
    src: "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=80",
    alt: "Luxury living room with city view"
  },
  {
    src: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
    alt: "Architectural home with wooden accents"
  }
];

const cityStrip =
  "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1800&q=80";

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-bg" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
        <div className="about-hero-overlay" />
        <div className="container about-hero-inner">
          <p className="about-hero-eyebrow">About Market Mizan</p>
          <h1>Clarity for every home search in Addis Ababa</h1>
          <p className="about-hero-lead">
            We bring together listings from trusted sources so you can explore real homes and neighbourhoods in one calm,
            modern experience — built for people who live and invest in Ethiopia’s capital.
          </p>
          <Link className="button about-hero-cta" to="/search">
            Browse listings
          </Link>
        </div>
      </section>

      <section className="container about-section about-intro">
        <div className="about-intro-grid">
          <div>
            <h2>Our mission</h2>
            <p>
              Finding the right property should not mean juggling dozens of sites. Market Mizan aggregates listings so you
              spend less time searching and more time visiting places that truly fit your life.
            </p>
            <p>
              Whether you are buying your first apartment, upgrading for your family, or scouting opportunities as an
              investor — we aim to give you a clear picture of what is on the market today.
            </p>
          </div>
          <div className="about-intro-card">
            <h3>Why Addis Ababa</h3>
            <p>
              The city is growing fast — new neighbourhoods, new projects, new stories. We focus on Addis Ababa because
              depth matters: better filters, better context, and a product tuned to how people actually search here.
            </p>
          </div>
        </div>
      </section>

      <section className="about-city-strip" aria-label="City atmosphere">
        <img src={cityStrip} alt="" className="about-city-strip-img" loading="lazy" />
        <div className="about-city-strip-caption container">
          <span>Urban energy, mountain light — a city in motion.</span>
        </div>
      </section>

      <section className="container about-section">
        <div className="about-section-head">
          <h2>People behind Market Mizan</h2>
          <p className="about-section-sub">
            A small team obsessed with trustworthy data, thoughtful design, and respectful support.
          </p>
        </div>
        <div className="about-team-grid">
          {team.map((member) => (
            <article key={member.name} className="about-team-card">
              <div className="about-team-photo-wrap">
                <img src={member.image} alt="" className="about-team-photo" loading="lazy" />
              </div>
              <h3>{member.name}</h3>
              <p className="about-team-role">{member.role}</p>
              <p className="about-team-bio">{member.bio}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-showcase">
        <div className="container">
          <div className="about-section-head">
            <h2>Homes that inspire us</h2>
            <p className="about-section-sub">
              A glimpse of architecture and interiors — the kind of spaces our users explore every day. (Illustrative
              imagery; actual listings appear in search.)
            </p>
          </div>
          <div className="about-gallery">
            {propertyShowcase.map((item) => (
              <figure key={item.src} className="about-gallery-item">
                <img src={item.src} alt={item.alt} loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta-band">
        <div className="container about-cta-inner">
          <div>
            <h2>Ready to find your place?</h2>
            <p>Search live listings, save time, and reach out when you are ready to take the next step.</p>
          </div>
          <Link className="button about-cta-btn" to="/contact">
            Contact us
          </Link>
        </div>
      </section>

      <p className="container about-photo-credit">
        Photos on this page are from{" "}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">
          Unsplash
        </a>{" "}
        (free to use under the{" "}
        <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
          Unsplash License
        </a>
        ).
      </p>
    </main>
  );
}
