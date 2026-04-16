import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api";

const INITIAL_PIN = { lat: 8.9806, lng: 38.7578 };

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

const STEPS = [
  { id: 1, label: "Property facts" },
  { id: 2, label: "Availability & contact" },
  { id: 3, label: "Location" }
];

export default function ListYourPropertyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    listingMode: "for_rent",
    propertyType: "apartment",
    price: "",
    sizeM2: "",
    rooms: "",
    availableFrom: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    latitude: INITIAL_PIN.lat,
    longitude: INITIAL_PIN.lng
  });

  const progress = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateCurrentStep() {
    if (step === 1) {
      return form.title && form.price && form.sizeM2 && form.rooms;
    }
    if (step === 2) {
      return form.availableFrom && form.contactName && form.contactEmail;
    }
    return Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude));
  }

  async function submitForm(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/properties/submit-listing", form);
      setSuccess("Thanks! Your listing was submitted. Our team will review it shortly.");
      setStep(1);
      setForm((prev) => ({
        ...prev,
        title: "",
        price: "",
        sizeM2: "",
        rooms: "",
        availableFrom: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        notes: "",
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
        <p className="upload-page-eyebrow">Landlords</p>
        <h1>List your property</h1>
        <p className="detail-subtitle upload-page-lead">
          A calm, structured flow — only what tenants and buyers need to decide faster.
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
                <span>Title</span>
                <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
              </label>

              <label className="contact-field">
                <span>Property type</span>
                <select value={form.propertyType} onChange={(e) => setField("propertyType", e.target.value)}>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                </select>
              </label>

              <label className="contact-field">
                <span>Listing mode</span>
                <select value={form.listingMode} onChange={(e) => setField("listingMode", e.target.value)}>
                  <option value="for_rent">For rent</option>
                  <option value="for_sale">For sale</option>
                </select>
              </label>

              <label className="contact-field">
                <span>Price (ETB)</span>
                <input type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} required />
              </label>

              <label className="contact-field">
                <span>Size (m²)</span>
                <input type="number" min="1" value={form.sizeM2} onChange={(e) => setField("sizeM2", e.target.value)} required />
              </label>

              <label className="contact-field">
                <span>Rooms</span>
                <input type="number" min="1" value={form.rooms} onChange={(e) => setField("rooms", e.target.value)} required />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="upload-grid-two">
              <label className="contact-field">
                <span>Available from</span>
                <input type="date" value={form.availableFrom} onChange={(e) => setField("availableFrom", e.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Contact name</span>
                <input value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Contact email</span>
                <input type="email" value={form.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} required />
              </label>
              <label className="contact-field">
                <span>Contact phone</span>
                <input value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
              </label>
              <label className="contact-field upload-wide">
                <span>Additional notes (optional)</span>
                <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={5} />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="upload-map-wrap">
              <p className="detail-subtitle">Tap on the map to pin the exact property location.</p>
              <MapContainer center={[form.latitude, form.longitude]} zoom={13} className="upload-map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
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
