import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Container, Section, Input, Select, Textarea, Button, Eyebrow } from "../components/ui";
import OsmPinPicker from "../components/OsmPinPicker";
import ListingStepIndicator, { ListingContinueButton } from "../components/ListingStepIndicator";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { CANONICAL_SUBCITIES } from "../utils/areaOptions";
import { ADDIS_DEFAULT_CENTER, getSubcityCenter } from "../utils/mapLocation";

const fieldLabel = "flex flex-col gap-1.5 text-sm";
const labelText = "font-semibold text-primary";
const gridTwo = "grid gap-5 sm:grid-cols-2";

const INITIAL_PIN = ADDIS_DEFAULT_CENTER;

const PROPERTY_TYPES = {
  residential: [
    { value: "house", label: "House – single detached house" },
    { value: "townhome", label: "Townhome – multi-level home" },
    { value: "apartment_condo", label: "Apartment / condo – single unit in a building" },
    { value: "apartment_units", label: "Apartment units – several apartment units" }
  ],
  commercial: [
    { value: "office", label: "Office – single unit on one floor" },
    { value: "office_building", label: "Office Building – entire building for office" },
    { value: "retail", label: "Retail – single unit for a shop" },
    { value: "retail_building", label: "Retail Building – entire building for shops" }
  ],
  industrial: [
    { value: "warehouse", label: "Warehouse – logistics or storage" },
    { value: "manufacturing", label: "Manufacturing building" },
    { value: "industrial_other", label: "Others – data centers, flex, cold storage, etc." }
  ],
  land: [{ value: "land", label: "Land" }]
};

const STEPS = [
  { id: 1, label: "Property type" },
  { id: 2, label: "Property facts" },
  { id: 3, label: "Location & contact" },
  { id: 4, label: "Professional recommendation" }
];

function RequiredLabel({ children }) {
  return (
    <span>
      {children} <span className="text-destructive" aria-hidden>*</span>
    </span>
  );
}

export default function ListYourPropertyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [images, setImages] = useState([]);
  const areaChoices = useMemo(() => CANONICAL_SUBCITIES, []);
  const [aiDescription, setAiDescription] = useState("");
  const [listening, setListening] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mapFlyTo, setMapFlyTo] = useState(null);
  const [form, setForm] = useState({
    propertyCategory: "residential",
    propertyType: "apartment_condo",
    listingMode: "for_rent",
    title: "",
    price: "",
    sizeM2: "",
    landAreaM2: "",
    bedrooms: "",
    bathrooms: "",
    kitchens: "",
    livingRooms: "",
    maidBedrooms: "",
    maidBathrooms: "",
    locationArea: "",
    availableFrom: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    aiTitleSuggestion: "",
    latitude: INITIAL_PIN.lat,
    longitude: INITIAL_PIN.lng
  });

  const typeOptions = PROPERTY_TYPES[form.propertyCategory] || PROPERTY_TYPES.residential;

  useEffect(() => {
    if (step !== 3 || !form.locationArea) return;
    const center = getSubcityCenter(form.locationArea);
    const atDefault =
      Number(form.latitude) === INITIAL_PIN.lat && Number(form.longitude) === INITIAL_PIN.lng;
    if (atDefault) {
      setForm((prev) => ({
        ...prev,
        latitude: center.lat,
        longitude: center.lng,
      }));
    }
    setMapFlyTo({ lat: center.lat, lng: center.lng, zoom: 14, token: `${step}-${form.locationArea}` });
  }, [step, form.locationArea]);

  function centerMapOnArea() {
    if (!form.locationArea) return;
    const center = getSubcityCenter(form.locationArea);
    setMapFlyTo({ lat: center.lat, lng: center.lng, zoom: 14, token: Date.now() });
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrentStep() {
    if (step === 1) return form.propertyCategory && form.propertyType;
    if (step === 2) {
      if (form.propertyCategory === "land") {
        return form.price && form.sizeM2 && form.locationArea;
      }
      return form.price && form.sizeM2 && form.bedrooms && form.bathrooms !== "" && form.locationArea;
    }
    if (step === 3) {
      return form.availableFrom && form.contactName && form.contactEmail &&
        Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude));
    }
    return Boolean(form.title);
  }

  async function loadTitleSuggestions() {
    setLoadingTitles(true);
    setError("");
    try {
      const r = await api.post("/listings/suggest-title", {
        listingMode: form.listingMode,
        propertyType: form.propertyType,
        locationArea: form.locationArea || "Addis Ababa",
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        price: form.price,
        rooms: form.bedrooms
      });
      setTitleSuggestions(r.data.suggestions || []);
      if (r.data.suggestions?.[0]) {
        setField("aiTitleSuggestion", r.data.suggestions[0]);
        if (!form.title) setField("title", r.data.suggestions[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate title suggestions.");
    } finally {
      setLoadingTitles(false);
    }
  }

  async function loadDescription() {
    try {
      const r = await api.post("/listings/suggest-description", { ...form, rooms: form.bedrooms });
      setAiDescription(r.data.description || "");
    } catch {
      setError("Could not generate description.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7));
        const lng = Number(pos.coords.longitude.toFixed(7));
        setField("latitude", lat);
        setField("longitude", lng);
        setMapFlyTo({ lat, lng, zoom: 16, token: Date.now() });
      },
      () => setError("Could not get your location.")
    );
  }

  function startVoiceNotes() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input not supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setField("notes", `${form.notes} ${text}`.trim());
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function submitForm(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
      fd.append("rooms", form.bedrooms);
      fd.append("aiDescription", aiDescription);
      fd.append("website", website);
      images.forEach((file) => fd.append("images", file));
      await api.post("/properties/submit-listing", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setSuccess("Thanks! Your listing was submitted. Our team will review it shortly.");
      setStep(1);
      setTitleSuggestions([]);
      setImages([]);
      setAiDescription("");
      setForm((prev) => ({
        ...prev,
        title: "",
        price: "",
        sizeM2: "",
        landAreaM2: "",
        bedrooms: "",
        bathrooms: "",
        kitchens: "",
        livingRooms: "",
        maidBedrooms: "",
        maidBathrooms: "",
        locationArea: "",
        availableFrom: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        notes: "",
        aiTitleSuggestion: "",
        latitude: INITIAL_PIN.lat,
        longitude: INITIAL_PIN.lng
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-brand-muted/40 to-transparent">
      <section className="py-10 sm:py-14">
        <Container>
          <Eyebrow>Landlords & agents</Eyebrow>
          <h1 className="relative mt-2 max-w-2xl text-3xl font-bold text-heading sm:text-4xl">
            List your property
            <span className="absolute -bottom-3 left-0 h-1 w-16 rounded-full bg-primary" aria-hidden />
          </h1>
          <p className="mt-8 max-w-2xl text-muted">
            Four clear steps — hard facts first, then a professional title recommendation.
          </p>
        </Container>
      </section>

      <Section className="pt-0">
        <Container className="max-w-4xl">
          <article className="overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <ListingStepIndicator steps={STEPS} currentStep={step} />

            <form className="flex flex-col gap-6" onSubmit={submitForm}>
            {step === 1 ? (
              <div className={gridTwo}>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>Category</RequiredLabel></span>
                  <Select
                    value={form.propertyCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        propertyCategory: cat,
                        propertyType: (PROPERTY_TYPES[cat] || PROPERTY_TYPES.residential)[0].value
                      }));
                    }}
                    required
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="land">Land</option>
                  </Select>
                </label>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>Property type</RequiredLabel></span>
                  <Select
                    value={form.propertyType}
                    onChange={(e) => setField("propertyType", e.target.value)}
                    required
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Select>
                </label>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>Listing mode</RequiredLabel></span>
                  <Select value={form.listingMode} onChange={(e) => setField("listingMode", e.target.value)}>
                    <option value="for_rent">For rent</option>
                    <option value="for_sale">For sale</option>
                  </Select>
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={gridTwo}>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>{form.listingMode === "for_sale" ? "Sale price (ETB)" : "Monthly rent (ETB)"}</RequiredLabel></span>
                  <Input type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
                </label>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>Unit size (m²)</RequiredLabel></span>
                  <Input type="number" min="1" value={form.sizeM2} onChange={(e) => setField("sizeM2", e.target.value)} required />
                </label>
                <label className={fieldLabel}>
                  <span className={labelText}>Land size (m²)</span>
                  <Input type="number" min="0" value={form.landAreaM2} onChange={(e) => setField("landAreaM2", e.target.value)} />
                </label>
                <label className={fieldLabel}>
                  <span className={labelText}><RequiredLabel>Sub-city / area</RequiredLabel></span>
                  <Select
                    value={form.locationArea}
                    onChange={(e) => setField("locationArea", e.target.value)}
                    required
                  >
                    <option value="">Select sub-city…</option>
                    {areaChoices.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </Select>
                </label>
                {form.propertyCategory !== "land" ? (
                  <>
                    <label className={fieldLabel}>
                      <span className={labelText}><RequiredLabel>Bedrooms</RequiredLabel></span>
                      <Input type="number" min="0" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} required />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelText}><RequiredLabel>Bathrooms</RequiredLabel></span>
                      <Input type="number" min="0" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} required />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelText}>Kitchens</span>
                      <Input type="number" min="0" value={form.kitchens} onChange={(e) => setField("kitchens", e.target.value)} />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelText}>Living rooms</span>
                      <Input type="number" min="0" value={form.livingRooms} onChange={(e) => setField("livingRooms", e.target.value)} />
                    </label>
                  </>
                ) : null}
                <fieldset className="col-span-full rounded-lg border border-line p-4">
                  <legend className="px-1 text-sm font-semibold text-primary">Maid quarter (optional)</legend>
                  <div className={gridTwo}>
                    <label className={fieldLabel}>
                      <span className={labelText}>Bedrooms</span>
                      <Input type="number" min="0" value={form.maidBedrooms} onChange={(e) => setField("maidBedrooms", e.target.value)} />
                    </label>
                    <label className={fieldLabel}>
                      <span className={labelText}>Bathrooms</span>
                      <Input type="number" min="0" value={form.maidBathrooms} onChange={(e) => setField("maidBathrooms", e.target.value)} />
                    </label>
                  </div>
                </fieldset>
                <label className={`${fieldLabel} col-span-full`}>
                  <span className={labelText}>Photos (max 6)</span>
                  <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 6))} />
                  <span className="text-xs text-muted">Photos are uploaded as-is. Set the map pin in the next step — GPS from photos is not applied automatically yet.</span>
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <div className={gridTwo}>
                  <label className={fieldLabel}>
                    <span className={labelText}><RequiredLabel>Available from</RequiredLabel></span>
                    <Input type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className={labelText}><RequiredLabel>Contact name</RequiredLabel></span>
                    <Input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className={labelText}><RequiredLabel>Contact email</RequiredLabel></span>
                    <Input type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className={labelText}>Contact phone</span>
                    <Input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
                  </label>
                  <label className={`${fieldLabel} col-span-full`}>
                    <span className={labelText}>Additional notes (optional)</span>
                    <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} />
                  </label>
                  <Button type="button" variant="secondary" onClick={startVoiceNotes} disabled={listening}>
                    {listening ? "Listening…" : "🎤 Add notes by voice"}
                  </Button>
                  <p className="col-span-full text-xs text-muted">Voice adds text to notes below. AI title and description are generated on the next step.</p>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-sm text-muted"><RequiredLabel>Pin location on map</RequiredLabel></p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
                      Use my current location
                    </Button>
                    {form.locationArea ? (
                      <Button type="button" variant="secondary" size="sm" onClick={centerMapOnArea}>
                        Center on {form.locationArea}
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-line">
                    <OsmPinPicker
                      latitude={form.latitude}
                      longitude={form.longitude}
                      areaLabel={form.locationArea || null}
                      flyTo={mapFlyTo}
                      onChange={(pos) => {
                        setField("latitude", pos.lat);
                        setField("longitude", pos.lng);
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Pin: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)} · OpenStreetMap
                  </p>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <div className={gridTwo}>
                <div className="col-span-full">
                  <Button type="button" variant="secondary" onClick={loadTitleSuggestions} disabled={loadingTitles}>
                    {loadingTitles ? "Generating…" : "Generate title suggestions"}
                  </Button>
                </div>
                <label className={`${fieldLabel} col-span-full`}>
                  <span className={labelText}><RequiredLabel>Suggested title</RequiredLabel></span>
                  <Select
                    value={form.aiTitleSuggestion || form.title}
                    onChange={(e) => {
                      setField("aiTitleSuggestion", e.target.value);
                      setField("title", e.target.value);
                    }}
                    required
                  >
                    <option value="">Select or type below</option>
                    {titleSuggestions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </label>
                <label className={`${fieldLabel} col-span-full`}>
                  <span className={labelText}><RequiredLabel>Listing title</RequiredLabel></span>
                  <Input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
                </label>
                <p className="col-span-full text-sm text-muted">
                  Titles are synthesized from hard facts only — no marketing copy from other sites.
                </p>
                <Button type="button" variant="secondary" className="col-span-full" onClick={loadDescription}>
                  Generate AI description
                </Button>
                {aiDescription ? (
                  <label className={`${fieldLabel} col-span-full`}>
                    <span className={labelText}>Description preview</span>
                    <Textarea readOnly value={aiDescription} rows={5} />
                  </label>
                ) : null}
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <div className="flex flex-wrap gap-3 border-t border-line pt-6">
              <Button type="button" variant="secondary" disabled={step <= 1 || submitting} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Back
              </Button>
              {step < STEPS.length ? (
                <ListingContinueButton
                  disabled={!validateCurrentStep() || submitting}
                  onClick={() => {
                    if (step === 3) loadTitleSuggestions();
                    setStep((s) => Math.min(STEPS.length, s + 1));
                  }}
                >
                  Continue
                </ListingContinueButton>
              ) : (
                <Button type="submit" variant="primary-gold" disabled={!validateCurrentStep() || submitting} className="gap-2">
                  {submitting ? "Submitting..." : "Submit listing"}
                  {!submitting ? <IconArrowRight className="text-primary" size={18} /> : null}
                </Button>
              )}
            </div>
          </form>
          </article>
      </Container>
    </Section>
    </main>
  );
}
