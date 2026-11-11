/** Homegate-style advisor: a hub, a section, then the Addis process as its own page. */
export const ADVISOR_SECTIONS = [
  {
    slug: "renting",
    title: "Renting",
    lead: "The path from a shortlist to a signed lease in Addis Ababa.",
    image: "/insights/renting.jpg",
    imageAlt: "Couple comparing a rental on a balcony above Addis Ababa",
    articles: [
      {
        slug: "find-a-home",
        title: "Find a home",
        lead: "Start with the sub-city and the size, not the headline rent.",
        image: "/insights/renting.jpg",
        imageAlt: "Couple comparing rental listings above the city",
        steps: [
          {
            title: "Pick two or three sub-cities",
            text: "Bole, Yeka, Kirkos and the rest of the city do not price the same. Name the places you can actually live the week before you open listings."
          },
          {
            title: "Read price per square metre",
            text: "A monthly rent in birr or dollars only makes sense next to the size. The Mizan Index above the listings is the district average, not the price of one flat."
          },
          {
            title: "Filter, then shortlist",
            text: "On Market Mizan open Rent, choose the sub-city, and keep homes you can visit. Furnished stock aimed at embassies and NGOs costs more per square metre."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Browse homes for rent"
      },
      {
        slug: "kinds-of-homes",
        title: "Kinds of homes",
        lead: "In Addis the building type changes the rent as much as the sub-city.",
        image: "/insights/living.jpg",
        imageAlt: "A light living room in a city apartment",
        steps: [
          {
            title: "Compound apartments",
            text: "Gated blocks with a guard, parking, and sometimes a generator or a shared garden. This is what many embassies, NGOs, and newcomers rent. The service charge sits on top of the rent."
          },
          {
            title: "Houses with a garden",
            text: "Villas suit families who want space. Ask whether a guard room is included, who pays the generator, and how the road floods in the rain."
          },
          {
            title: "Ordinary apartment blocks",
            text: "A flat in a normal building is often the lower rent. You get less shared security and fewer services. Compare it per square metre on the index, not against a furnished compound in Bole."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Browse homes for rent"
      },
      {
        slug: "the-viewing",
        title: "The viewing",
        lead: "See the building at the hour you would actually live there.",
        image: "/insights/city.jpg",
        imageAlt: "Addis Ababa in late afternoon light",
        steps: [
          {
            title: "Go in daylight",
            text: "Check water pressure, power, windows, and the noise from the street. A generator in the compound matters more than a wide photo."
          },
          {
            title: "Time the drive",
            text: "A short line on the map can still be a long trip at rush hour. Drive the journey you make most often, not the one at noon on a Sunday."
          },
          {
            title: "Ask what is included",
            text: "Service charge, generator fuel, water, and Wi‑Fi are often extra. Write down who pays each one before you talk about the rent."
          }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "the-lease",
        title: "The lease",
        lead: "Advance rent and the notice period decide the real cost.",
        image: "/insights/lease.jpg",
        imageAlt: "Couple reviewing a lease at the kitchen table",
        steps: [
          {
            title: "Count the months paid upfront",
            text: "Many leases still run for a year, paid in one sum or in two halves. A deposit of about one or two months is common. Some landlords who rent to newcomers will take dollars or euros. The monthly figure is not the cash you need on the day you sign."
          },
          {
            title: "Register the contract",
            text: "A lease should be registered locally to hold. Ask the landlord who files it. Photograph the rooms and test power, water, and hot water before you pay."
          },
          {
            title: "Read the rise and the notice",
            text: "Note whether the rent can change mid-term, how many months of notice you must give, and who repairs what."
          },
          {
            title: "Keep the papers",
            text: "Keep the signed lease, the inventory, and the Market Mizan listing reference. That reference is how you reach us about that home later."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Start a rent search"
      }
    ]
  },
  {
    slug: "buying",
    title: "Buying",
    lead: "What to check before you buy an apartment or a house in the capital.",
    image: "/insights/buying.jpg",
    imageAlt: "Home for sale in warm evening light",
    articles: [
      {
        slug: "compare-the-price",
        title: "Compare the price",
        lead: "Two homes with the same price can be very different once you look at square metres.",
        image: "/insights/buying.jpg",
        imageAlt: "Exterior of a home for sale",
        steps: [
          {
            title: "Put the price next to the size",
            text: "Sale prices on the Mizan Index are USD or ETB per square metre. An apartment uses living area. A house sale often uses the land."
          },
          {
            title: "Stay inside one sub-city",
            text: "Compare Bole with Bole, not Bole with a southern sub-city, before you decide a home is expensive."
          },
          {
            title: "Treat a range as a start",
            text: "Developer projects often publish a price range, not one unit. Confirm the exact unit, floor, and what is still unfinished."
          }
        ],
        to: "/?listing_mode=for_sale",
        cta: "Browse homes for sale"
      },
      {
        slug: "papers-and-the-seller",
        title: "Papers and the seller",
        lead: "Know who is selling and what the papers cover before you negotiate.",
        image: "/insights/listing.jpg",
        imageAlt: "Keys handed over for a property",
        steps: [
          {
            title: "Name the seller",
            text: "Ask whether you are dealing with the owner, an agent, or a developer. The answer changes which papers you should see."
          },
          {
            title: "Walk the property and the street",
            text: "Photos are not the home. Walk the plot or the floor, the access road, and the drainage."
          },
          {
            title: "Separate ready from unfinished",
            text: "A home still being finished has a different price. Ask what is included and what you will still have to complete."
          }
        ],
        to: "/contact",
        cta: "Ask Market Mizan"
      },
      {
        slug: "the-building-not-the-land",
        title: "The building, not the land",
        lead: "In Ethiopia the land stays with the state. A purchase is the house or the apartment on a long lease.",
        image: "/insights/buying.jpg",
        imageAlt: "A home seen from the street",
        steps: [
          {
            title: "Confirm what you are buying",
            text: "Foreign buyers can now look at residential buildings. The plot itself is not sold. It is held on a long land lease. A lawyer should say which paper covers the unit you want."
          },
          {
            title: "Do not use a forum price as your offer",
            text: "Quoted dollar ranges go stale. Use the Mizan Index for the sub-city, then price the exact unit, floor, and finish."
          },
          {
            title: "Budget the closing work",
            text: "Notary, registration, and a lawyer sit on top of the price. Plan several months, not a weekend, from the first visit to the keys."
          }
        ],
        to: "/?listing_mode=for_sale",
        cta: "Browse homes for sale"
      }
    ]
  },
  {
    slug: "moving",
    title: "Moving",
    lead: "Arriving in Addis, or moving across the city, in a practical order.",
    image: "/insights/moving.jpg",
    imageAlt: "Couple carrying boxes into an empty apartment",
    articles: [
      {
        slug: "choose-the-area",
        title: "Choose the area",
        lead: "Work, school, and the evening drive decide the sub-city.",
        image: "/insights/city.jpg",
        imageAlt: "Addis Ababa seen from above",
        steps: [
          {
            title: "List the trips you repeat",
            text: "Office, school, and the airport are different journeys. Pick the sub-city that fits the one you do most days."
          },
          {
            title: "Budget space against location",
            text: "Southern and western sub-cities often give more space for the same budget. Bole and parts of Yeka are chosen for newer buildings and shorter trips to many offices."
          }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "money-and-papers",
        title: "Money and papers",
        lead: "Have the cash and the copies ready before you collect the keys.",
        image: "/insights/moving.jpg",
        imageAlt: "People moving boxes into a new home",
        steps: [
          {
            title: "Advance, deposit, agent",
            text: "Budget the advance rent, a deposit, and an agent fee if there is one. Do this before you promise a move-in date."
          },
          {
            title: "Copies and a local contact",
            text: "Keep passport or ID copies and a local phone number the landlord or the building can reach."
          },
          {
            title: "Cross-check the building",
            text: "If you found the home elsewhere, look for the same building on Market Mizan and keep the listing reference."
          }
        ],
        to: "/?listing_mode=for_rent&furnished=true",
        cta: "See furnished rentals"
      },
      {
        slug: "before-you-fly",
        title: "Before you fly",
        lead: "Sort the stay, then the home. A year lease is easier after you have seen the city.",
        image: "/insights/city.jpg",
        imageAlt: "Addis Ababa from a balcony",
        steps: [
          {
            title: "Visa first, flat second",
            text: "A short look-around is an e-visa, applied before you travel. Working needs a permit through your employer. Visa on arrival at Bole is the queue to avoid."
          },
          {
            title: "Sleep short-term first",
            text: "A hotel or a furnished month lets you visit Bole, Old Airport, Kazanchis, and CMC before you commit to a year paid up front."
          },
          {
            title: "Ask the employer",
            text: "Many organisations already have a housing contact or a compound. Use that list, then check the same homes on Market Mizan."
          }
        ],
        to: "/?listing_mode=for_rent&furnished=true",
        cta: "See furnished rentals"
      }
    ]
  },
  {
    slug: "building",
    title: "Building and renovating",
    lead: "A build in Addis starts with the plot, the sub-city, and a clear scope.",
    image: "/insights/building.jpg",
    imageAlt: "Renovation tools in a bright room",
    articles: [
      {
        slug: "the-scope",
        title: "The scope",
        lead: "Finishing a flat, extending a house, and building on a plot are three different jobs.",
        image: "/insights/building.jpg",
        imageAlt: "A room being renovated",
        steps: [
          {
            title: "Name the job",
            text: "Cost and time follow that choice. A shell apartment is not the same budget as a plot with no structure."
          },
          {
            title: "Permission before materials",
            text: "Check the plot and the permission path with the sub-city before you order materials. Access, drainage, and neighbours become expensive if they are ignored."
          },
          {
            title: "Ask what the sale price excludes",
            text: "If you are buying a home that is still being finished, list what you will still have to pay for after the contract."
          }
        ],
        to: "/contact",
        cta: "Ask Market Mizan"
      }
    ]
  },
  {
    slug: "financing",
    title: "Financing",
    lead: "How people in Addis usually pay, and what to take to a bank.",
    image: "/insights/lease.jpg",
    imageAlt: "Financing papers on a kitchen table",
    articles: [
      {
        slug: "how-payment-works",
        title: "How payment works",
        lead: "Rent is often cash in advance. A purchase is a much larger sum.",
        image: "/insights/lease.jpg",
        imageAlt: "Couple going through payment documents",
        steps: [
          {
            title: "Rent is usually birr, often upfront",
            text: "Several months can be due at once. Dollars appear on some furnished and international listings. Compare both in the same currency on the index."
          },
          {
            title: "A purchase may mix savings and a loan",
            text: "Banks ask for income, identity, and the property: price, size, and sub-city. Have those three before the first meeting."
          },
          {
            title: "Market Mizan does not lend",
            text: "We do not arrange the loan. We can introduce a financing contact once you have a home in mind."
          }
        ],
        to: "/contact",
        cta: "Contact us"
      }
    ]
  },
  {
    slug: "living",
    title: "Living and furnishing",
    lead: "The first weeks in the building, not only the day you get the keys.",
    image: "/insights/living.jpg",
    imageAlt: "A furnished living room with daylight",
    articles: [
      {
        slug: "the-first-week",
        title: "The first week",
        lead: "Water, power, and the gate matter as much as the furniture.",
        image: "/insights/living.jpg",
        imageAlt: "Living room ready to move into",
        steps: [
          {
            title: "Meet the building",
            text: "Confirm the building contact, how guests and deliveries get through the gate, and where the generator sits."
          },
          {
            title: "Open the accounts",
            text: "Water and power are often separate from the rent. Ask which account is already in the landlord’s name."
          },
          {
            title: "Measure before you furnish",
            text: "Many apartments are rented empty. Furnished stock is priced higher. Measure the rooms before you buy sofas or beds."
          }
        ],
        to: "/contact",
        cta: "Talk to us"
      },
      {
        slug: "bills-and-the-compound",
        title: "Bills and the compound",
        lead: "The rent is not the month. Power, water, internet, and the service charge sit beside it.",
        image: "/insights/living.jpg",
        imageAlt: "Daylight in a city living room",
        steps: [
          {
            title: "Ask for the last bills",
            text: "Power moves with air conditioning and the generator. Water is usually the small bill. Internet in most homes is Ethio Telecom. Get the last three months in writing."
          },
          {
            title: "Read the service charge",
            text: "Compounds often bill separately for the guard, the garden, and the rubbish. Confirm what that fee includes before you compare two rents."
          },
          {
            title: "Staff is a choice, not a surprise",
            text: "A housekeeper or a night guard is common and is your contract, not the landlord’s, unless the listing says otherwise."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Browse homes for rent"
      }
    ]
  },
  {
    slug: "selling",
    title: "Selling",
    lead: "How owners, agents, and developers put a home on Market Mizan.",
    image: "/insights/listing.jpg",
    imageAlt: "Keys passed across a desk",
    articles: [
      {
        slug: "a-listing-people-trust",
        title: "A listing people trust",
        lead: "Price, sub-city, size, photos, and a map pin.",
        image: "/insights/listing.jpg",
        imageAlt: "Handing over keys for a new listing",
        steps: [
          {
            title: "State the facts",
            text: "A clear price, the sub-city, the size, and real photos. You can upload up to 10 photos. After review, up to 6 are shown."
          },
          {
            title: "Put the pin on the home",
            text: "Listings without a precise pin are harder to trust and harder to find on the map."
          },
          {
            title: "Wait for the reference",
            text: "We review the submission before it goes live, then send you the listing reference."
          }
        ],
        to: "/list-your-property",
        cta: "List your property"
      }
    ]
  },
  {
    slug: "sub-cities",
    title: "Sub-cities",
    lead: "Addis is read by sub-city. The right one depends on how you live the week.",
    image: "/insights/city.jpg",
    imageAlt: "The city in warm light",
    articles: [
      {
        slug: "how-the-city-is-divided",
        title: "How the city is divided",
        lead: "Eleven sub-cities, not one average price.",
        image: "/insights/city.jpg",
        imageAlt: "Addis Ababa skyline",
        steps: [
          {
            title: "Learn the names",
            text: "Bole, Yeka, Kirkos, Arada, Lideta, Nifas Silk-Lafto, Kolfe Keranio, Gullele, Addis Ketema, Akaki Kaliti, and Lemi Kura."
          },
          {
            title: "Match the week, not the postcard",
            text: "Kirkos and Arada sit closer to the centre. Southern and western sub-cities can offer more space. Newer apartments cluster in Bole and parts of Yeka."
          },
          {
            title: "Use the map",
            text: "The neighborhood map is the fastest way to see which sub-city matches a search."
          }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "where-newcomers-live",
        title: "Where newcomers live",
        lead: "The same few neighbourhoods come up in every arrival conversation. Check them against the index.",
        image: "/insights/renting.jpg",
        imageAlt: "Looking over Addis from a balcony",
        steps: [
          {
            title: "Bole",
            text: "Closest to the airport, hotels, and many organisation offices. Compounds are common. Rents sit at the top of the city. Use the index before you treat a dollar headline as normal."
          },
          {
            title: "Old Airport and Kazanchis",
            text: "Old Airport is established and quieter. Kazanchis is for people who work in the business centre. Both are central. Time the evening drive anyway."
          },
          {
            title: "CMC, Sarbet, Hayahulet",
            text: "CMC draws families because of the international schools. Sarbet and Hayahulet are often the step down in rent while staying on a main road. Schools and clinics elsewhere in the country are thinner, which is why most newcomers stay in Addis."
          }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      }
    ]
  },
  {
    slug: "prices",
    title: "Market prices",
    lead: "How to read the Mizan Index before you shortlist a home.",
    image: "/insights/market.jpg",
    imageAlt: "Price charts on a desk",
    articles: [
      {
        slug: "read-the-index",
        title: "Read the index",
        lead: "Four lanes: rent and buy, apartment and house.",
        image: "/insights/market.jpg",
        imageAlt: "A desk with market charts",
        steps: [
          {
            title: "Switch USD and ETB",
            text: "The amounts change with the currency. The percent stays the same, because both months use one rate."
          },
          {
            title: "Rent and buy use different units",
            text: "Rent is per square metre per month. A purchase is per square metre. Do not compare those two numbers as if they were the same thing."
          },
          {
            title: "A district pill opens the search",
            text: "The arrow is the change since last month. It is context, not a forecast. Sub-city averages are not like-for-like."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Explore listings"
      }
    ]
  }
];

export function advisorSection(slug) {
  return ADVISOR_SECTIONS.find((section) => section.slug === slug) || null;
}

export function advisorArticle(sectionSlug, articleSlug) {
  const section = advisorSection(sectionSlug);
  if (!section) return null;
  const article = section.articles.find((item) => item.slug === articleSlug);
  if (!article) return null;
  return { section, article };
}
