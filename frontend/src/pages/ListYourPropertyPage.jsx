import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api";

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
      {children} <span className="required-star" aria-hidden>*</span>
    </span>
  );
}

export default function ListYourPropertyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
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

  async function submitForm(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/properties/submit-listing", {
        ...form,
        rooms: form.bedrooms
      });
      setSuccess("Thanks! Your listing was submitted. Our team will review it shortly.");
      setStep(1);
      setTitleSuggestions([]);
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
    <main className="page-walde upload-page">
      <div className="container section-space">
        <section className="upload-hero panel upload-hero-walde">
          <p className="upload-page-eyebrow">Landlords & agents</p>
          <h1>List your property</h1>
          <p className="detail-subtitle upload-page-lead">
            Four clear steps — hard facts first, then a professional title recommendation.
          </p>
        </section>

        <section className="panel upload-panel upload-panel-walde">
          <div className="upload-progress-head">
            <div className="upload-steps">
              {STEPS.map((s) => (
                <span key={s.id} className={`upload-step-pill ${step >= s.id ? "active" : ""}`}>
                  {s.id}. {s.label}
                </span>
              ))}
            </div>
            <div className="upload-progress-line">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form className="upload-form" onSubmit={submitForm}>
            {step === 1 ? (
              <div className="upload-grid-two">
                <label className="contact-field">
                  <RequiredLabel>Category</RequiredLabel>
                  <select
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
                  </select>
                </label>
                <label className="contact-field">
                  <RequiredLabel>Property type</RequiredLabel>
                  <select
                    value={form.propertyType}
                    onChange={(e) => setField("propertyType", e.target.value)}
                    required
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </label>
                <label className="contact-field">
                  <RequiredLabel>Listing mode</RequiredLabel>
                  <select value={form.listingMode} onChange={(e) => setField("listingMode", e.target.value)}>
                    <option value="for_rent">For rent</option>
                    <option value="for_sale">For sale</option>
                  </select>
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="upload-grid-two">
                <label className="contact-field">
                  <RequiredLabel>{form.listingMode === "for_sale" ? "Sale price (ETB)" : "Monthly rent (ETB)"}</RequiredLabel>
                  <input type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
                </label>
                <label className="contact-field">
                  <RequiredLabel>Unit size (m²)</RequiredLabel>
                  <input type="number" min="1" value={form.sizeM2} onChange={(e) => setField("sizeM2", e.target.value)} required />
                </label>
                <label className="contact-field">
                  <span>Land size (m²)</span>
                  <input type="number" min="0" value={form.landAreaM2} onChange={(e) => setField("landAreaM2", e.target.value)} />
                </label>
                <label className="contact-field">
                  <span>Area / neighborhood</span>
                  <input value={form.locationArea} onChange={(e) => setField("locationArea", e.target.value)} placeholder="e.g. Bole Rwanda" />
                </label>
                {form.propertyCategory !== "land" ? (
                  <>
                    <label className="contact-field">
                      <RequiredLabel>Bedrooms</RequiredLabel>
                      <input type="number" min="0" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} required />
                    </label>
                    <label className="contact-field">
                      <RequiredLabel>Bathrooms</RequiredLabel>
                      <input type="number" min="0" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} required />
                    </label>
                    <label className="contact-field">
                      <span>Kitchens</span>
                      <input type="number" min="0" value={form.kitchens} onChange={(e) => setField("kitchens", e.target.value)} />
                    </label>
                    <label className="contact-field">
                      <span>Living rooms</span>
                      <input type="number" min="0" value={form.livingRooms} onChange={(e) => setField("livingRooms", e.target.value)} />
                    </label>
                  </>
                ) : null}
                <fieldset className="upload-wide maid-quarter-fieldset">
                  <legend>Maid quarter (optional)</legend>
                  <div className="upload-grid-two">
                    <label className="contact-field">
                      <span>Bedrooms</span>
                      <input type="number" min="0" value={form.maidBedrooms} onChange={(e) => setField("maidBedrooms", e.target.value)} />
                    </label>
                    <label className="contact-field">
                      <span>Bathrooms</span>
                      <input type="number" min="0" value={form.maidBathrooms} onChange={(e) => setField("maidBathrooms", e.target.value)} />
                    </label>
                  </div>
                </fieldset>
              </div>
            ) : null}

            {step === 3 ? (
              <>
                <div className="upload-grid-two">
                  <label className="contact-field">
                    <RequiredLabel>Available from</RequiredLabel>
                    <input type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} required />
                  </label>
                  <label className="contact-field">
                    <RequiredLabel>Contact name</RequiredLabel>
                    <input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} required />
                  </label>
                  <label className="contact-field">
                    <RequiredLabel>Contact email</RequiredLabel>
                    <input type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} required />
                  </label>
                  <label className="contact-field">
                    <span>Contact phone</span>
                    <input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
                  </label>
                  <label className="contact-field upload-wide">
                    <span>Additional notes (optional)</span>
                    <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} />
                  </label>
                </div>
                <div className="upload-map-wrap">
                  <p className="detail-subtitle"><RequiredLabel>Pin location on map</RequiredLabel></p>
                  <MapContainer center={[form.latitude, form.longitude]} zoom={13} className="upload-map">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <PinPicker
                      value={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
                      onChange={(pos) => {
                        setField("latitude", Number(pos.lat.toFixed(7)));
                        setField("longitude", Number(pos.lng.toFixed(7)));
                      }}
                    />
                  </MapContainer>
                  <p className="upload-map-coordinates">
                    Pin: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                  </p>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <div className="upload-grid-two">
                <div className="upload-wide">
                  <button type="button" className="button upload-secondary" onClick={loadTitleSuggestions} disabled={loadingTitles}>
                    {loadingTitles ? "Generating…" : "Generate title suggestions"}
                  </button>
                </div>
                <label className="contact-field upload-wide">
                  <RequiredLabel>Suggested title</RequiredLabel>
                  <select
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
                  </select>
                </label>
                <label className="contact-field upload-wide">
                  <RequiredLabel>Listing title</RequiredLabel>
                  <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
                </label>
                <p className="upload-wide muted-inline">
                  Titles are synthesized from hard facts only — no marketing copy from other sites.
                </p>
              </div>
            ) : null}

            {error ? <p className="contact-form-error">{error}</p> : null}
            {success ? <p className="upload-success">{success}</p> : null}

            <div className="upload-actions">
              <button
                type="button"
                className="button upload-secondary"
                disabled={step <= 1 || submitting}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </button>
              {step < STEPS.length ? (
                <button
                  type="button"
                  disabled={!validateCurrentStep() || submitting}
                  onClick={() => {
                    if (step === 3) loadTitleSuggestions();
                    setStep((s) => Math.min(STEPS.length, s + 1));
                  }}
                >
                  Continue
                </button>
              ) : (
                <button type="submit" disabled={!validateCurrentStep() || submitting}>
                  {submitting ? "Submitting..." : "Submit listing"}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
