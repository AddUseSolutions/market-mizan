import { Link } from "react-router-dom";
import { Container, Section, Eyebrow } from "../components/ui";

const TOPICS = [
  {
    id: "renting",
    title: "Renting",
    lead: "How to compare a monthly rent in Addis Ababa before you commit.",
    body: [
      "Most homes here are offered as a monthly rent. Compare the price with the size, the number of rooms, and the sub-city, not the headline alone.",
      "Ask what the rent includes, when it is due, and how long the agreement runs. Visit in daylight and check water, power, and the road at the hour you would actually travel.",
      "On Market Mizan, open Rent and filter by sub-city. The map shows where homes sit, and the price band above the listings shows how districts compare."
    ],
    to: "/?listing_mode=for_rent",
    cta: "Browse homes for rent"
  },
  {
    id: "buying",
    title: "Buying",
    lead: "What to look at before you buy a house or apartment in the city.",
    body: [
      "A sale price only makes sense next to the size and the sub-city. Two homes with the same price can be very different once you look at square metres and location.",
      "Confirm who is selling, what the papers cover, and whether the home is ready to move into or still under construction. Walk the property and the street, not only the photos.",
      "Open Buy on Market Mizan and compare listings side by side. Use the district prices as a guide, then check the individual home."
    ],
    to: "/?listing_mode=for_sale",
    cta: "Browse homes for sale"
  },
  {
    id: "sub-cities",
    title: "Sub-cities",
    lead: "Addis Ababa is read by sub-city. The right one depends on how you live.",
    body: [
      "The city is divided into sub-cities such as Bole, Yeka, Kirkos, Arada, Lideta, Nifas Silk-Lafto, Kolfe Keranio, Gullele, Addis Ketema, Akaki Kaliti, and Lemi Kura.",
      "Bole and parts of Yeka are often chosen for newer apartments and shorter trips to many offices. Kirkos and Arada sit closer to the centre. Southern and western sub-cities can offer more space for the same budget.",
      "Prices and stock change by area. The neighborhood map is the fastest way to see which sub-city matches a search."
    ],
    to: "/neighborhoods",
    cta: "Open the city map"
  },
  {
    id: "moving",
    title: "Moving",
    lead: "A move inside Addis is easier when the new area fits the week you actually live.",
    body: [
      "Time the trip you make most often — work, school, or family — at rush hour, not on an empty Sunday. A shorter distance on the map can still be a long drive.",
      "Book the move for a day the building allows access, and confirm lifts, parking, and the gate with the building before the truck arrives.",
      "Set the new home’s sub-city in your search first, then shortlist only the homes you can reach comfortably."
    ],
    to: "/",
    cta: "Start a new search"
  },
  {
    id: "building",
    title: "Building and renovating",
    lead: "A build or a renovation in Addis starts with the plot, the sub-city, and a clear scope.",
    body: [
      "Know whether you are finishing an apartment, extending a house, or building on a plot. The cost and the time follow that choice.",
      "Check the plot and the permission path with the sub-city before you order materials. A design that ignores access, drainage, or the neighbours becomes expensive later.",
      "If you are buying a home that is still being finished, ask what is included in the price and what you will still have to complete."
    ],
    to: "/contact",
    cta: "Ask Market Mizan"
  },
  {
    id: "financing",
    title: "Financing",
    lead: "How people in Addis usually pay, and what to prepare before you talk to a bank.",
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
    title: "Living",
    lead: "Settle into the home, not only the listing.",
    body: [
      "After you move in, confirm the building contact, the water and power account, and how guests and deliveries get through the gate.",
      "Furnishing is easier if you measure rooms before you buy. Many apartments are rented empty.",
      "Keep the listing reference if you found the home on Market Mizan. It helps if you need to reach us about that property later."
    ],
    to: "/contact",
    cta: "Talk to us"
  },
  {
    id: "listing",
    title: "List your property",
    lead: "Owners and agents can put a home on Market Mizan for people already searching Addis.",
    body: [
      "A clear price, the sub-city, the size, and real photos are what make a listing useful. You can upload up to 10 photos. After review, up to 6 are shown.",
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
      <Section className="bg-gradient-to-b from-brand-muted to-transparent pb-6">
        <Container>
          <Eyebrow>Addis Ababa</Eyebrow>
          <h1 className="mt-2 text-3xl font-bold text-heading sm:text-4xl">Market Insights</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Practical guidance for renting, buying, and living in Addis Ababa. Pick a topic, then continue into the listings.
          </p>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((topic) => (
              <li key={topic.id}>
                <a
                  href={`#${topic.id}`}
                  className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft transition-colors hover:border-primary/40"
                >
                  <h2 className="text-lg font-semibold text-heading">{topic.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{topic.lead}</p>
                  <span className="mt-4 text-sm font-semibold text-primary">Read</span>
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {TOPICS.map((topic) => (
        <Section key={topic.id} id={topic.id} className="scroll-mt-24 border-t border-line py-10">
          <Container className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-heading">{topic.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-brand-deep">
              {topic.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link to={topic.to} className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
              {topic.cta}
            </Link>
          </Container>
        </Section>
      ))}
    </main>
  );
}
