import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api";
import { Container, Section, Card, CardContent, Input, Select, Textarea, Button } from "../components/ui";
import { cn } from "../utils/cn";

const fieldLabel = "flex flex-col gap-1.5 text-sm";
const gridTwo = "grid gap-4 sm:grid-cols-2";

const INITIAL_PIN = { lat: 8.9806, lng: 38.7578 };

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

function PinPicker({ value, onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  return (
    <CircleMarker
      center={value}
      radius={9}
      pathOptions={{ color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.85, weight: 2 }}
    />
  );
}

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
  const [aiDescription, setAiDescription] = useState("");
  const [listening, setListening] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  const progress = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);
  const typeOptions = PROPERTY_TYPES[form.propertyCategory] || PROPERTY_TYPES.residential;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrentStep() {
    if (step === 1) return form.propertyCategory && form.propertyType;
    if (step === 2) {
      if (form.propertyCategory === "land") {
        return form.price && form.sizeM2;
      }
      return form.price && form.sizeM2 && form.bedrooms && form.bathrooms !== "";
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
        setField("latitude", Number(pos.coords.latitude.toFixed(7)));
        setField("longitude", Number(pos.coords.longitude.toFixed(7)));
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
    <Section>
      <Container>
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent>
            <p className="text-sm font-medium uppercase tracking-wider text-accent">Landlords & agents</p>
            <h1 className="mt-2 text-3xl font-bold text-heading">List your property</h1>
            <p className="mt-2 text-muted">Four clear steps — hard facts first, then a professional title recommendation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {STEPS.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    step >= s.id ? "bg-primary text-white" : "bg-line/50 text-muted"
                  )}
                >
                  {s.id}. {s.label}
                </span>
              ))}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form className="flex flex-col gap-6" onSubmit={submitForm}>
            {step === 1 ? (
              <div className={gridTwo}>
                <label className={fieldLabel}>
                  <span className="font-medium"><RequiredLabel>Category</RequiredLabel></span>
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
                  <span className="font-medium"><RequiredLabel>Property type</RequiredLabel></span>
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
                  <span className="font-medium"><RequiredLabel>Listing mode</RequiredLabel></span>
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
                  <span className="font-medium"><RequiredLabel>{form.listingMode === "for_sale" ? "Sale price (ETB)" : "Monthly rent (ETB)"}</RequiredLabel></span>
                  <Input type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium"><RequiredLabel>Unit size (m²)</RequiredLabel></span>
                  <Input type="number" min="1" value={form.sizeM2} onChange={(e) => setField("sizeM2", e.target.value)} required />
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium">Land size (m²)</span>
                  <Input type="number" min="0" value={form.landAreaM2} onChange={(e) => setField("landAreaM2", e.target.value)} />
                </label>
                <label className={fieldLabel}>
                  <span className="font-medium">Area / neighborhood</span>
                  <Input value={form.locationArea} onChange={(e) => setField("locationArea", e.target.value)} placeholder="e.g. Bole Rwanda" />
                </label>
                {form.propertyCategory !== "land" ? (
                  <>
                    <label className={fieldLabel}>
                      <span className="font-medium"><RequiredLabel>Bedrooms</RequiredLabel></span>
                      <Input type="number" min="0" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} required />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium"><RequiredLabel>Bathrooms</RequiredLabel></span>
                      <Input type="number" min="0" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} required />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium">Kitchens</span>
                      <Input type="number" min="0" value={form.kitchens} onChange={(e) => setField("kitchens", e.target.value)} />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium">Living rooms</span>
                      <Input type="number" min="0" value={form.livingRooms} onChange={(e) => setField("livingRooms", e.target.value)} />
                    </label>
                  </>
                ) : null}
                <fieldset className="col-span-full rounded-lg border border-line p-4">
                  <legend className="px-1 text-sm font-medium">Maid quarter (optional)</legend>
                  <div className={gridTwo}>
                    <label className={fieldLabel}>
                      <span className="font-medium">Bedrooms</span>
                      <Input type="number" min="0" value={form.maidBedrooms} onChange={(e) => setField("maidBedrooms", e.target.value)} />
                    </label>
                    <label className={fieldLabel}>
                      <span className="font-medium">Bathrooms</span>
                      <Input type="number" min="0" value={form.maidBathrooms} onChange={(e) => setField("maidBathrooms", e.target.value)} />
                    </label>
                  </div>
                </fieldset>
                <label className={`${fieldLabel} col-span-full`}>
                  <span className="font-medium">Photos (max 6)</span>
                  <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setImages(Array.from(e.target.files || []).slice(0, 6))} />
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <div className={gridTwo}>
                  <label className={fieldLabel}>
                    <span className="font-medium"><RequiredLabel>Available from</RequiredLabel></span>
                    <Input type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className="font-medium"><RequiredLabel>Contact name</RequiredLabel></span>
                    <Input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className="font-medium"><RequiredLabel>Contact email</RequiredLabel></span>
                    <Input type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} required />
                  </label>
                  <label className={fieldLabel}>
                    <span className="font-medium">Contact phone</span>
                    <Input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
                  </label>
                  <label className={`${fieldLabel} col-span-full`}>
                    <span className="font-medium">Additional notes (optional)</span>
                    <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} />
                  </label>
                  <Button type="button" variant="secondary" onClick={startVoiceNotes} disabled={listening}>
                    {listening ? "Listening…" : "🎤 Add notes by voice"}
                  </Button>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-sm text-muted"><RequiredLabel>Pin location on map</RequiredLabel></p>
                  <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>Use my current location</Button>
                  <div className="mt-3 overflow-hidden rounded-xl border border-line">
                    <MapContainer center={[form.latitude, form.longitude]} zoom={13} className="h-[320px] w-full z-0">
                      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <PinPicker
                        value={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
                        onChange={(pos) => {
                          setField("latitude", Number(pos.lat.toFixed(7)));
                          setField("longitude", Number(pos.lng.toFixed(7)));
                        }}
                      />
                    </MapContainer>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Pin: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
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
                  <span className="font-medium"><RequiredLabel>Suggested title</RequiredLabel></span>
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
                  <span className="font-medium"><RequiredLabel>Listing title</RequiredLabel></span>
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
                    <span className="font-medium">Description preview</span>
                    <Textarea readOnly value={aiDescription} rows={5} />
                  </label>
                ) : null}
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px]" tabIndex={-1} autoComplete="off" aria-hidden />
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={step <= 1 || submitting} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Back
              </Button>
              {step < STEPS.length ? (
                <Button
                  type="button"
                  disabled={!validateCurrentStep() || submitting}
                  onClick={() => {
                    if (step === 3) loadTitleSuggestions();
                    setStep((s) => Math.min(STEPS.length, s + 1));
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={!validateCurrentStep() || submitting}>
                  {submitting ? "Submitting..." : "Submit listing"}
                </Button>
              )}
            </div>
          </form>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
