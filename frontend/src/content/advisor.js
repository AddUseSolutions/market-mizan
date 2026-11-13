/** Homegate-style advisor: hub → section → Addis Ababa process pages. Expert voice for buyers and renters. */
export const ADVISOR_SECTIONS = [
  {
    slug: "renting",
    title: "Renting",
    lead: "How to shortlist, view, and sign a lease in Addis Ababa without overpaying for the wrong building.",
    image: "/insights/renting.jpg",
    imageAlt: "Ethiopian couple on a balcony overlooking the Addis Ababa skyline",
    articles: [
      {
        slug: "find-a-home",
        title: "Find a home",
        lead: "Start with the week you live, not the headline rent on a WhatsApp photo.",
        image: "/insights/renting.jpg",
        imageAlt: "Ethiopian couple comparing the city from a modern balcony",
        steps: [
          {
            title: "Name two or three sub-cities first",
            text: "Bole, Yeka, Kirkos, and the rest of Addis do not price the same. Decide where you can actually live the week — office, school, airport — before you open listings."
          },
          {
            title: "Read price per square metre",
            text: "A monthly rent in birr or dollars only makes sense next to the size. The Mizan Index above the listings is the district average, not the price of one flat. Use it to spot a listing that sits far above the neighbourhood."
          },
          {
            title: "Filter, then shortlist what you can visit",
            text: "On Market Mizan open Rent, choose the sub-city, and keep homes you can see in daylight. Furnished stock aimed at embassies and NGOs costs more per square metre — that is a choice, not a bargain."
          }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Browse homes for rent"
      },
      {
        slug: "kinds-of-homes",
        title: "Kinds of homes",
        lead: "In Addis the building type changes the rent as much as the sub-city. Choose the lifestyle before you negotiate.",
        image: "/insights/compound.jpg",
        imageAlt: "Gated residential compound with mid-rise apartments",
        steps: [
          {
            title: "Compound apartments",
            text: "Gated blocks with a guard, parking, and often a generator or shared garden. This is what many embassies, NGOs, and newcomers rent. The service charge sits on top of the rent — ask for it in writing."
          },
          {
            title: "Houses with a garden",
            text: "Villas suit families who want space. Ask whether a guard room is included, who pays the generator, and how the road floods in the rains. A quiet compound can still mean a long evening drive."
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
        lead: "See the building at the hour you would actually live there. Photos sell hope. The visit sells truth.",
        image: "/insights/viewing.jpg",
        imageAlt: "Ethiopian woman inspecting a bright empty apartment during a viewing",
        steps: [
          {
            title: "Go in daylight",
            text: "Check water pressure, power, windows, and street noise. A generator in the compound matters more than a wide photo. Test hot water and open every cupboard."
          },
          {
            title: "Time the drive you will hate most",
            text: "A short line on the map can still be a long trip at rush hour. Drive the journey you make most often, not the one at noon on a Sunday."
          },
          {
            title: "Ask what is included — then write it down",
            text: "Service charge, generator fuel, water, and Wi‑Fi are often extra. Ethio Telecom is the usual internet path. Who pays each bill should be clear before you talk about the rent."
          }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "the-lease",
        title: "The lease",
        lead: "Advance rent and the notice period decide the real cost. Sign only when the cash and the papers match.",
        image: "/insights/lease.jpg",
        imageAlt: "Ethiopian couple reviewing lease papers at a kitchen table",
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
            text: "Note whether the rent can change mid-term, how many months of notice you must give, and who repairs what. Ambiguity here becomes an expensive argument later."
          },
          {
            title: "Keep the papers and the listing reference",
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
    lead: "You are not buying a postcard. You are buying a building in Addis Ababa on a land lease — with a price that must survive the Mizan Index.",
    image: "/insights/buying-family.jpg",
    imageAlt: "Ethiopian family looking up at a modern apartment building they may buy",
    articles: [
      {
        slug: "compare-the-price",
        title: "Compare the price",
        lead: "Two homes with the same asking price can be very different once you look at square metres and the sub-city.",
        image: "/insights/buying.jpg",
        imageAlt: "Modern house with a garden in warm highland light",
        steps: [
          {
            title: "Put the price next to the size",
            text: "Sale prices on the Mizan Index are USD or ETB per square metre. An apartment uses living area. A house sale often uses the land. If the listing hides the size, you cannot compare it."
          },
          {
            title: "Stay inside one sub-city",
            text: "Compare Bole with Bole, Kazanchis with Kazanchis — not Bole with a southern sub-city — before you decide a home is expensive. The city is not one market."
          },
          {
            title: "Treat a range as a start, not a deal",
            text: "Developer projects often publish a price range, not one unit. Confirm the exact unit, floor, finish, and what is still unfinished before you negotiate."
          },
          {
            title: "Ignore stale dollar stories",
            text: "Forum and guide ranges go cold. Use the live Mizan Index for the sub-city, then price the exact building you are standing in."
          }
        ],
        to: "/?listing_mode=for_sale",
        cta: "Browse homes for sale"
      },
      {
        slug: "papers-and-the-seller",
        title: "Papers and the seller",
        lead: "Know who is selling and what the papers cover before you talk money. Charm is not title.",
        image: "/insights/listing.jpg",
        imageAlt: "House keys ready for a property handover",
        steps: [
          {
            title: "Name the seller",
            text: "Ask whether you are dealing with the owner, an agent, or a developer. The answer changes which papers you must see and who can sign."
          },
          {
            title: "Walk the property and the street",
            text: "Photos are not the home. Walk the plot or the floor, the access road, the drainage, and the neighbouring builds. Unfinished next door becomes your problem."
          },
          {
            title: "Separate ready from unfinished",
            text: "A home still being finished has a different price and a different risk. List what is included and what you will still have to complete after the contract."
          },
          {
            title: "Bring a lawyer early",
            text: "A local lawyer who knows Addis title practice should read the papers before you transfer money. Market Mizan shows the market. The lawyer protects the deal."
          }
        ],
        to: "/contact",
        cta: "Ask Market Mizan"
      },
      {
        slug: "the-building-not-the-land",
        title: "The building, not the land",
        lead: "In Addis Ababa you buy the apartment or the house. The land stays with the state, on a long lease. That is the deal — understand it before you fall for the view.",
        image: "/insights/buying-family.jpg",
        imageAlt: "Ethiopian family considering a modern apartment purchase",
        steps: [
          {
            title: "Confirm what you are buying",
            text: "You buy the flat or the house, not the plot. The land stays with the state on a long lease. A lawyer should say which paper covers the unit in that sub-city — and how long the lease runs."
          },
          {
            title: "Foreign buyers: know the path before you fly",
            text: "Residential buildings can be open to foreign buyers under current rules, but process and paperwork still decide whether a deal closes. Do not assume a WhatsApp listing equals a permitted purchase. Confirm eligibility with counsel before you pay a deposit."
          },
          {
            title: "Budget the closing work",
            text: "Notary, registration, and a lawyer sit on top of the price. Plan several months, not a weekend, from the first visit to the keys. Rushing is how people buy the wrong paper."
          },
          {
            title: "Price the lifestyle, then the asset",
            text: "Schools, compounds, and the evening drive matter as much as the finish. A cheaper unit in the wrong sub-city costs you every week you live there."
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
    lead: "Arrive in Addis Ababa with a plan: visa, customs, short stay, then the year lease — not the other way around.",
    image: "/insights/moving.jpg",
    imageAlt: "Ethiopian couple carrying boxes into a bright new apartment",
    articles: [
      {
        slug: "moving-to-ethiopia",
        title: "Moving to Ethiopia",
        lead: "Everything to line up before you sign a lease in Addis: entry papers, household goods, money, and where you will sleep the first weeks.",
        image: "/insights/moving.jpg",
        imageAlt: "Boxes and travel bags ready for a move to Addis Ababa",
        steps: [
          {
            title: "Treat arrival as a project",
            text: "Visa, temporary stay, school or office location, and a housing budget belong on one timeline. Signing a year lease on day two is how people overpay."
          },
          {
            title: "Start with papers, not photos",
            text: "Confirm how long you can legally stay and work. Landlords and compounds often ask for ID before a serious viewing."
          },
          {
            title: "Decide furnished vs shipment",
            text: "A furnished month buys time. A container needs customs lead time and a place that can receive it."
          },
          {
            title: "Learn the city before the deposit",
            text: "Rush hour between Bole, CMC, Kazanchis, and Old Airport changes which sub-city feels right. Use the map, then compare asking prices on Market Mizan."
          },
          {
            title: "Keep a cash buffer",
            text: "Advance rent, deposit, agent fee, SIM, and a short hotel stay stack quickly. Hold back until the building and the papers match."
          }
        ],
        related: [
          { section: "moving", article: "visa-and-entry", label: "Visa and entry" },
          { section: "moving", article: "customs-and-household-goods", label: "Customs and household goods" },
          { section: "moving", article: "banks-phones-and-money", label: "Banks, phones, and money" },
          { section: "moving", article: "schools-health-and-daily-life", label: "Schools, health, and daily life" },
          { section: "moving", article: "choose-the-area", label: "Choose the area" }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "choose-the-area",
        title: "Choose the area",
        lead: "Work, school, and the evening drive decide the sub-city. The postcard does not.",
        image: "/insights/city.jpg",
        imageAlt: "Elevated view of Addis Ababa with highland hills",
        steps: [
          {
            title: "List the trips you repeat",
            text: "Office, school, and the airport are different journeys. Pick the sub-city that fits the one you do most days. Light rail and ride-hailing help — rush hour still rules."
          },
          {
            title: "Budget space against location",
            text: "Southern and western sub-cities often give more space for the same budget. Bole and parts of Yeka are chosen for newer buildings and shorter trips to many offices and hotels."
          },
          {
            title: "Walk the street at the right hour",
            text: "A quiet compound at noon can sit on a loud corridor at 18:00. Visit once in daylight and once near the commute you will actually do."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "before-you-fly", label: "Before you fly" }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      },
      {
        slug: "money-and-papers",
        title: "Money and papers",
        lead: "Have the cash and the copies ready before you collect the keys.",
        image: "/insights/moving.jpg",
        imageAlt: "Ethiopian couple moving boxes into a new home",
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
        related: [
          { section: "moving", article: "banks-phones-and-money", label: "Banks, phones, and money" },
          { section: "moving", article: "visa-and-entry", label: "Visa and entry" }
        ],
        to: "/?listing_mode=for_rent&furnished=true",
        cta: "See furnished rentals"
      },
      {
        slug: "before-you-fly",
        title: "Before you fly",
        lead: "Sort the stay, then the home. A year lease is easier after you have seen the city at rush hour.",
        image: "/insights/city.jpg",
        imageAlt: "Addis Ababa from above in soft afternoon light",
        steps: [
          {
            title: "Visa first, flat second",
            text: "Get the visa before you land at Bole. A short visit is an e-visa. Working needs a permit through your employer. The visa-on-arrival queue at the airport is the one to avoid."
          },
          {
            title: "Sleep short-term first",
            text: "Stay in a hotel or a furnished month in Addis first. Visit Bole, Old Airport, Kazanchis, and CMC before you pay a year up front. Buy only after you have walked the building."
          },
          {
            title: "Ask the employer",
            text: "Many organisations already have a housing contact or a compound. Use that list, then check the same homes on Market Mizan against the index."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "visa-and-entry", label: "Visa and entry" },
          { section: "moving", article: "customs-and-household-goods", label: "Customs and household goods" }
        ],
        to: "/?listing_mode=for_rent&furnished=true",
        cta: "See furnished rentals"
      },
      {
        slug: "visa-and-entry",
        title: "Visa and entry",
        lead: "Entry papers decide how long you can look for a home — and whether a landlord will take the lease.",
        image: "/insights/moving.jpg",
        imageAlt: "Passport and travel documents ready for a move",
        steps: [
          {
            title: "Match the visa to the stay",
            text: "Tourist and business e-visas cover short visits. A work or residence status usually comes through an employer or sponsoring organisation. Confirm the category before you book a year lease."
          },
          {
            title: "Apply before you fly",
            text: "Use the official e-visa channel when your nationality allows it. Rules and processing times change — screenshot confirmations and keep the approval with your passport."
          },
          {
            title: "Carry copies at viewing time",
            text: "Landlords and building managers often want a passport copy and a local phone number. Keep digital and paper copies ready when you visit compounds."
          },
          {
            title: "Do not rely on visa-on-arrival",
            text: "Queues at Bole International can be long and eligibility is not universal. Landing without a plan can burn the first days you needed for housing."
          },
          {
            title: "Check renewals before move-in",
            text: "If your status expires mid-lease, ask the employer how renewals work. A sudden gap can complicate deposits and agent introductions."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "customs-and-household-goods", label: "Customs and household goods" },
          { section: "moving", article: "banks-phones-and-money", label: "Banks, phones, and money" }
        ],
        to: "/?listing_mode=for_rent&furnished=true",
        cta: "See furnished rentals"
      },
      {
        slug: "customs-and-household-goods",
        title: "Customs and household goods",
        lead: "Shipping a container is a project of its own — plan it beside the lease, not after the keys.",
        image: "/insights/compound.jpg",
        imageAlt: "Residential compound with space for arriving goods",
        steps: [
          {
            title: "Decide what must travel",
            text: "Many newcomers rent furnished first and ship only essentials. Unfurnished leases need a clearer inventory and more lead time."
          },
          {
            title: "Use a mover who knows Addis",
            text: "Ask for door-to-door timelines, duty estimates, and who clears customs. Keep serial numbers for electronics and a photo inventory."
          },
          {
            title: "Align the lease with delivery",
            text: "A year lease with a late container leaves you paying for empty rooms. Confirm storage options in the compound if the shipment arrives early."
          },
          {
            title: "Budget duty and last-mile",
            text: "Airport or port fees, trucking into the city, and building access (stairs, generators, security hours) often cost more than people expect."
          },
          {
            title: "Ask about restricted items",
            text: "Some goods need extra paperwork or are impractical to import. Confirm the list with your mover before the container is sealed."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "visa-and-entry", label: "Visa and entry" },
          { section: "moving", article: "money-and-papers", label: "Money and papers" }
        ],
        to: "/contact",
        cta: "Ask Market Mizan"
      },
      {
        slug: "banks-phones-and-money",
        title: "Banks, phones, and money",
        lead: "You need a working number and a way to pay rent before the deposit conversation gets serious.",
        image: "/insights/lease.jpg",
        imageAlt: "Phone and papers used to arrange a rental payment",
        steps: [
          {
            title: "Get a local SIM early",
            text: "Agents and landlords call. A local number on Ethio Telecom or Safaricom Ethiopia makes viewings and follow-ups much easier."
          },
          {
            title: "Ask how rent is paid",
            text: "Cash in advance is still common. Some landlords accept bank transfer. Clarify currency (ETB vs USD talk) and get receipts for every payment."
          },
          {
            title: "Open banking with employer help",
            text: "Account opening rules change. HR or a relocation contact often knows which branch accepts foreign passports and what papers you need."
          },
          {
            title: "Keep a buffer for the first month",
            text: "Advance rent, deposit, agent fee, and a short hotel stay can stack. Cross-check asking prices on Market Mizan so the buffer matches the sub-city."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "money-and-papers", label: "Money and papers" },
          { section: "moving", article: "schools-health-and-daily-life", label: "Schools, health, and daily life" }
        ],
        to: "/?listing_mode=for_rent",
        cta: "Browse rentals"
      },
      {
        slug: "schools-health-and-daily-life",
        title: "Schools, health, and daily life",
        lead: "Family logistics often decide the sub-city faster than the listing photos.",
        image: "/insights/city.jpg",
        imageAlt: "Daily life streets and services in Addis Ababa",
        steps: [
          {
            title: "Map school runs first",
            text: "International schools cluster in a few corridors. A beautiful house far from the school gate can cost more in time than the rent saves."
          },
          {
            title: "Ask about clinics and pharmacies",
            text: "Know the nearest trusted clinic and pharmacy for your compound. New arrivals often underestimate evening and weekend access."
          },
          {
            title: "Plan power and water realities",
            text: "Generators, water tanks, and building rules differ by compound. Ask what fails during outages before you sign."
          },
          {
            title: "Budget daily services",
            text: "Drivers, cleaners, and security fees are common add-ons. Put them next to rent when you compare two homes on Market Mizan."
          }
        ],
        related: [
          { section: "moving", article: "moving-to-ethiopia", label: "Moving to Ethiopia" },
          { section: "moving", article: "choose-the-area", label: "Choose the area" },
          { section: "moving", article: "banks-phones-and-money", label: "Banks, phones, and money" }
        ],
        to: "/neighborhoods",
        cta: "Open the city map"
      }
    ]
  },
  {
    slug: "building",
    title: "Building and renovating",
    lead: "A build in Addis starts with the plot, the sub-city, and a clear scope — before the paint.",
    image: "/insights/building.jpg",
    imageAlt: "Bright room mid-renovation with paint and tools",
    articles: [
      {
        slug: "the-scope",
        title: "The scope",
        lead: "Finishing a flat, extending a house, and building on a plot are three different jobs.",
        image: "/insights/building.jpg",
        imageAlt: "A room being renovated in daylight",
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
    lead: "How people in Addis usually pay — and what to take to a bank before the first meeting.",
    image: "/insights/lease.jpg",
    imageAlt: "Ethiopian couple going through financing papers at home",
    articles: [
      {
        slug: "how-payment-works",
        title: "How payment works",
        lead: "Rent is often cash in advance. A purchase is a much larger sum with a longer paper trail.",
        image: "/insights/lease.jpg",
        imageAlt: "Ethiopian couple reviewing payment documents",
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
    lead: "The first weeks in the building decide whether the rent was a good idea — not only the day you get the keys.",
    image: "/insights/living.jpg",
    imageAlt: "Bright furnished living room ready to move into",
    articles: [
      {
        slug: "the-first-week",
        title: "The first week",
        lead: "Water, power, and the gate matter as much as the furniture.",
        image: "/insights/living.jpg",
        imageAlt: "Living room with soft daylight",
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
        image: "/insights/compound.jpg",
        imageAlt: "Secure compound entrance with apartments beyond the gate",
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
    lead: "How owners, agents, and developers put an Addis Ababa home on Market Mizan so buyers can trust it.",
    image: "/insights/listing.jpg",
    imageAlt: "Keys on a table for a property listing",
    articles: [
      {
        slug: "a-listing-people-trust",
        title: "A listing people trust",
        lead: "Price, sub-city, size, photos, and a map pin — nothing vague.",
        image: "/insights/listing.jpg",
        imageAlt: "House keys for a new listing",
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
    lead: "Addis is read by sub-city. The right one depends on how you live the week — and where the schools and offices sit.",
    image: "/insights/city.jpg",
    imageAlt: "Addis Ababa skyline under highland light",
    articles: [
      {
        slug: "how-the-city-is-divided",
        title: "How the city is divided",
        lead: "Eleven sub-cities, not one average price.",
        image: "/insights/city.jpg",
        imageAlt: "Dense Addis Ababa cityscape",
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
        lead: "The same few neighbourhoods come up in every arrival conversation. Check them against the index before you pay.",
        image: "/insights/compound.jpg",
        imageAlt: "Compound living in a secure residential block",
        steps: [
          {
            title: "Bole",
            text: "Closest to the airport, hotels, and many organisation offices. Compounds are common. Rents sit at the top of the city. Use the index before you treat a dollar headline as normal."
          },
          {
            title: "Old Airport and Kazanchis",
            text: "Old Airport is established and quieter. Kazanchis is for people who work in the business centre and near the African Union. Both are central. Time the evening drive anyway."
          },
          {
            title: "CMC, Sarbet, Hayahulet",
            text: "CMC draws families because the international schools are there. Sarbet and Hayahulet are often the step down in rent while staying on a main road inside the city."
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
    lead: "How to read the Mizan Index before you shortlist — or before you make an offer.",
    image: "/insights/market.jpg",
    imageAlt: "Desk with coffee and a laptop showing market charts",
    articles: [
      {
        slug: "read-the-index",
        title: "Read the index",
        lead: "Four lanes: rent and buy, apartment and house. This is your reality check.",
        image: "/insights/market.jpg",
        imageAlt: "Market charts on a laptop with Ethiopian coffee",
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
            text: "The arrow is the change since last month. It is context, not a forecast. Sub-city averages are not like-for-like — they tell you where to look harder."
          }
        ],
        to: "/?listing_mode=for_sale",
        cta: "Explore homes for sale"
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
