import { Link } from "react-router-dom";
import { Container, Section, Eyebrow } from "../components/ui";
import { IconArrowRight, IconBuilding, IconHouse, IconKey, IconMapPin, IconBed } from "../components/icons/HeroIcons";

const heroImage =
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2000&q=80";

const TOPICS = [
  {
    id: "renting",
    icon: IconKey,
    title: "Renting in Addis",
    lead: "How expats and locals compare a monthly rent before they commit.",
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
    icon: IconHouse,
    title: "Buying a home",
    lead: "What to check before you buy an apartment or house in the capital.",
    body: [
      "A sale price only makes sense next to living size and sub-city. Two homes with the same price can be very different once you look at square metres and location.",
      "Confirm who is selling, what the papers cover, and whether the home is ready to move into or still under construction. Walk the property and the street, not only the photos.",
      "Developer projects (for example from Hoblen) often publish a price range rather than a single unit price — treat that as a starting point, then confirm the exact unit."
    ],
    to: "/?listing_mode=for_sale",
    cta: "Browse homes for sale"
  },
  {
    id: "sub-cities",
    icon: IconMapPin,
    title: "Sub-cities",
    lead: "Addis is read by sub-city. The right one depends on how you live the week.",
    body: [
      "The city is divided into sub-cities such as Bole, Yeka, Kirkos, Arada, Lideta, Nifas Silk-Lafto, Kolfe Keranio, Gullele, Addis Ketema, Akaki Kaliti, and Lemi Kura.",
      "Bole and parts of Yeka are often chosen for newer apartments and shorter trips to many offices. Kirkos and Arada sit closer to the centre. Southern and western sub-cities can offer more space for the same budget.",
      "The neighborhood map is the fastest way to see which sub-city matches a search."
    ],
    to: "/neighborhoods",
    cta: "Open the city map"
  },
  {
    id: "expat-move",
    icon: IconBed,
    title: "Moving as an expat",
    lead: "A practical sequence for arriving or relocating inside Addis.",
    body: [
      "Shortlist two or three sub-cities that fit work, school, and evening travel. Time the trip you make most often at rush hour — a short line on the map can still be a long drive.",
      "Budget for advance rent, agent fees if any, and a security deposit. Keep passport copies and a local contact ready for the landlord or building.",
      "Furnished apartments on Expat.com and similar boards are often aimed at embassies and NGOs. Cross-check the same building on Market Mizan when you can."
    ],
    to: "/?listing_mode=for_rent&furnished=true",
    cta: "See furnished rentals"
  },
  {
    id: "building",
    icon: IconBuilding,
    title: "Building and renovating",
    lead: "A build or renovation starts with the plot, the sub-city, and a clear scope.",
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
    icon: IconHouse,
    title: "Financing",
    lead: "How people in Addis usually pay — and what to prepare before a bank meeting.",
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
    icon: IconKey,
    title: "Living in the home",
    lead: "Settle into the building, not only the listing.",
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
    icon: IconBuilding,
    title: "List your property",
    lead: "Owners, agents, and developers can put a home in front of people already searching Addis.",
    body: [
      "A clear price, the sub-city, the size, and real photos make a listing useful. You can upload up to 10 photos; after review, up to 6 are shown.",
      "Set the map pin on the home. Listings without a precise pin are harder to trust and harder to find.",
      "We review the submission before it goes live, then send you the listing reference."
    ],
    to: "/list-your-property",
    cta: "List your property"
  }
];

export default function InsightsPage() {
  return (
    <main>
      <section className="relative min-h-[min(420px,70vh)] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/25" aria-hidden />
        <Container className="relative z-10 flex min-h-[min(420px,70vh)] items-end py-12 sm:py-14">
          <div className="max-w-2xl text-white">
            <Eyebrow className="text-white/80">Advisory · Addis Ababa</Eyebrow>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.6rem]">
              Market Insights for people who live and work here
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90">
              Practical guidance for renting, buying, and settling in Addis Ababa — written for locals, returnees, and the
              expat community. Pick a topic, then continue into the listings.
            </p>
          </div>
        </Container>
      </section>

      <Section className="pt-10 sm:pt-12">
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <li key={topic.id}>
                  <a
                    href={`#${topic.id}`}
                    className="flex h-full flex-col border-b border-line bg-transparent p-4 transition-colors hover:border-primary"
                  >
                    <Icon className="text-primary" size={22} />
                    <h2 className="mt-3 text-lg font-semibold text-heading">{topic.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{topic.lead}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Read
                      <IconArrowRight size={16} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Container>
      </Section>

      {TOPICS.map((topic) => {
        const Icon = topic.icon;
        return (
          <Section key={topic.id} id={topic.id} className="scroll-mt-24 border-t border-line py-12">
            <Container className="max-w-3xl">
              <div className="flex items-center gap-3">
                <Icon className="text-primary" size={22} />
                <Eyebrow>Guide</Eyebrow>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-heading sm:text-3xl">{topic.title}</h2>
              <p className="mt-3 text-base text-muted">{topic.lead}</p>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-brand-deep">
                {topic.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <Link
                to={topic.to}
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                {topic.cta}
                <IconArrowRight size={16} />
              </Link>
            </Container>
          </Section>
        );
      })}
    </main>
  );
}
