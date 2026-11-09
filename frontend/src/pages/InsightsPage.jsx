import { Link } from "react-router-dom";
import { Container, Section } from "../components/ui";
import { IconArrowRight } from "../components/icons/HeroIcons";

/** Local advisor photos (KI) — Homegate-style topic cards. */
const TOPICS = [
  {
    id: "renting",
    title: "Renting",
    lead: "How to compare a monthly rent in Addis before you commit — size, sub-city, and what the price includes.",
    image: "/insights/renting.jpg",
    imageAlt: "Bright apartment living room ready to rent",
    body: [
      "Most homes are offered as a monthly rent in birr or dollars. Compare the asking price with the size, the number of rooms, and the sub-city — not the headline alone.",
      "Ask what the rent includes (service charge, generator, water, Wi‑Fi), when it is due, and how many months are paid upfront. Visit in daylight and check water, power, and the road at the hour you would actually travel.",
      "Furnished rentals common with NGOs and embassies cost more per square metre. On Market Mizan, open Rent and use the district prices above the listings as a guide, then filter by sub-city."
    ],
    to: "/?listing_mode=for_rent",
    cta: "Browse homes for rent"
  },
  {
    id: "buying",
    title: "Buying",
    lead: "What to check before you buy an apartment or house in the capital.",
    image: "/insights/buying.jpg",
    imageAlt: "Modern home exterior for sale",
    body: [
      "A sale price only makes sense next to living size and sub-city. Two homes with the same price can be very different once you look at square metres and location.",
      "Confirm who is selling, what the papers cover, and whether the home is ready to move into or still under construction. Walk the property and the street, not only the photos.",
      "Developer projects often publish a price range rather than a single unit price — treat that as a starting point, then confirm the exact unit."
    ],
    to: "/?listing_mode=for_sale",
    cta: "Browse homes for sale"
  },
  {
    id: "moving",
    title: "Moving",
    lead: "A practical sequence for arriving or relocating inside Addis Ababa.",
    image: "/insights/moving.jpg",
    imageAlt: "People packing boxes for a move",
    body: [
      "Shortlist two or three sub-cities that fit work, school, and evening travel. Time the trip you make most often at rush hour — a short line on the map can still be a long drive.",
      "Budget for advance rent, agent fees if any, and a security deposit. Keep passport copies and a local contact ready for the landlord or building.",
      "Furnished apartments are often aimed at embassies and NGOs. Cross-check the same building on Market Mizan when you can."
    ],
    to: "/?listing_mode=for_rent&furnished=true",
    cta: "See furnished rentals"
  },
  {
    id: "sub-cities",
    title: "Sub-cities",
    lead: "Addis is read by sub-city. The right one depends on how you live the week.",
    image: "/insights/city.jpg",
    imageAlt: "City skyline at dusk",
    body: [
      "The city is divided into sub-cities such as Bole, Yeka, Kirkos, Arada, Lideta, Nifas Silk-Lafto, Kolfe Keranio, Gullele, Addis Ketema, Akaki Kaliti, and Lemi Kura.",
      "Bole and parts of Yeka are often chosen for newer apartments and shorter trips to many offices. Kirkos and Arada sit closer to the centre. Southern and western sub-cities can offer more space for the same budget.",
      "The neighborhood map is the fastest way to see which sub-city matches a search."
    ],
    to: "/neighborhoods",
    cta: "Open the city map"
  },
  {
    id: "building",
    title: "Building and renovating",
    lead: "A build or renovation starts with the plot, the sub-city, and a clear scope.",
    image: "/insights/building.jpg",
    imageAlt: "Renovating a room with paint and tools",
    body: [
      "Know whether you are finishing an apartment, extending a house, or building on a plot. Cost and time follow that choice.",
      "Check the plot and the permission path with the sub-city before you order materials. A design that ignores access, drainage, or neighbours becomes expensive later.",
      "If you are buying a home that is still being finished, ask what is included in the price and what you will still have to complete."
    ],
    to: "/contact",
    cta: "Ask Market Mizan"
  },
  {
    id: "financing",
    title: "Financing",
    lead: "How people in Addis usually pay — and what to prepare before a bank meeting.",
    image: "/insights/lease.jpg",
    imageAlt: "Couple reviewing financing documents at the kitchen table",
    body: [
      "Rent is usually paid in birr, often several months at a time. A purchase is a much larger payment, and many buyers combine savings with a bank loan.",
      "Banks will ask for income, identity, and details of the property. Have the asking price, the size, and the sub-city ready before the first meeting.",
      "Market Mizan does not arrange the loan. We can introduce you to a financing contact once you have a home in mind."
    ],
    to: "/contact",
    cta: "Contact us"
  },
  {
    id: "living",
    title: "Living and furnishing",
    lead: "Settle into the building, not only the listing.",
    image: "/insights/living.jpg",
    imageAlt: "Furnished living room with natural light",
    body: [
      "After you move in, confirm the building contact, the water and power account, and how guests and deliveries get through the gate.",
      "Furnishing is easier if you measure rooms before you buy. Many apartments are rented empty; furnished stock is priced higher.",
      "Keep the listing reference if you found the home on Market Mizan. It helps if you need to reach us about that property later."
    ],
    to: "/contact",
    cta: "Talk to us"
  },
  {
    id: "listing",
    title: "List your property",
    lead: "Tips for owners, agents, and developers who want a listing people can trust.",
    image: "/insights/listing.jpg",
    imageAlt: "Keys handed over for a new listing",
    body: [
      "A clear price, the sub-city, the size, and real photos make a listing useful. You can upload up to 10 photos; after review, up to 6 are shown.",
      "Set the map pin on the home. Listings without a precise pin are harder to trust and harder to find.",
      "We review the submission before it goes live, then send you the listing reference."
    ],
    to: "/list-your-property",
    cta: "List your property"
  },
  {
    id: "market",
    title: "Market prices",
    lead: "Use the Mizan Index above the listings to read district prices per square metre.",
    image: "/insights/market.jpg",
    imageAlt: "Charts and analytics on a desk",
    body: [
      "The Mizan Index shows live district prices for rent and buy, split by apartment and house.",
      "Click a district pill to open the matching search. Compare USD per square metre across sub-cities before you shortlist homes.",
      "Month-over-month arrows show when a district has moved — useful context, not a forecast."
    ],
    to: "/?listing_mode=for_rent",
    cta: "Explore listings"
  }
];

function TopicCard({ topic }) {
  return (
    <article className="group flex h-full flex-col">
      <a href={`#${topic.id}`} className="block overflow-hidden rounded-xl">
        <img
          src={topic.image}
          alt={topic.imageAlt}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </a>
      <h2 className="mt-4 text-xl font-semibold text-heading">{topic.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{topic.lead}</p>
      <a
        href={`#${topic.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
      >
        Find out more
        <IconArrowRight size={16} />
      </a>
    </article>
  );
}

export default function InsightsPage() {
  return (
    <main className="bg-bg">
      <Section className="pb-4 pt-10 sm:pt-14">
        <Container>
          <p className="text-sm text-muted">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2 text-line">/</span>
            <span className="text-heading">Advisor</span>
          </p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-heading sm:text-5xl">Advisor</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Practical guides for renting, buying, moving, and living in Addis Ababa — for locals, returnees, and the expat
            community. Pick a topic, then continue into the listings.
          </p>
        </Container>
      </Section>

      <Section className="pb-16 pt-6">
        <Container>
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((topic) => (
              <li key={topic.id}>
                <TopicCard topic={topic} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {TOPICS.map((topic, index) => (
        <section
          key={topic.id}
          id={topic.id}
          className={`scroll-mt-24 border-t border-line py-14 ${index % 2 === 0 ? "bg-surface" : "bg-bg"}`}
        >
          <Container>
            <div className="grid items-start gap-10 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl">
                <img
                  src={topic.image}
                  alt={topic.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover lg:aspect-[5/4]"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Guide</p>
                <h2 className="mt-2 text-3xl font-semibold text-heading">{topic.title}</h2>
                <p className="mt-3 text-base text-muted">{topic.lead}</p>
                <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-brand-deep">
                  {topic.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <Link
                  to={topic.to}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  {topic.cta}
                  <IconArrowRight size={16} />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      ))}
    </main>
  );
}
