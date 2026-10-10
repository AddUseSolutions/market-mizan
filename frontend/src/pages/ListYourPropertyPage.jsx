import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Container, Section, Input, Select, Textarea, Button, Eyebrow } from "../components/ui";
import OsmPinPicker from "../components/OsmPinPicker";
import ListingStepIndicator, { ListingContinueButton } from "../components/ListingStepIndicator";
import { IconArrowRight } from "../components/icons/HeroIcons";
import { CANONICAL_SUBCITIES } from "../utils/areaOptions";
import { ADDIS_DEFAULT_CENTER, getSubcityCenter, isInAddisBounds } from "../utils/mapLocation";
import { readExifGps } from "../utils/exifGps";
import { prepareListingPhoto } from "../utils/prepareListingPhoto";

const fieldLabel = "flex flex-col gap-1.5 text-sm";
const labelText = "font-semibold text-primary";
const gridTwo = "grid gap-5 sm:grid-cols-2";

const INITIAL_PIN = ADDIS_DEFAULT_CENTER;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;

function PhotoThumbs({ files, onRemove }) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);
  if (!files.length) return null;
  return (
    <ul className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
      {urls.map((url, idx) => (
        <li key={url} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-line/30">
          <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
            aria-label={`Remove photo ${idx + 1}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function isValidTitleSuggestion(title) {
  const value = String(title || "").trim();
  if (!value) return false;
  if (/^```/.test(value)) return false;
  if (/^json$/i.test(value)) return false;
  return value.length >= 8 && value.length <= 160;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function collectSubmitErrors(form) {
  const errors = [];
  if (!String(form.title || "").trim()) errors.push("listing title");
  if (!form.propertyType) errors.push("property type");
  if (!form.listingMode) errors.push("listing mode");
  if (!form.availableFrom) errors.push("available-from date");
  if (!String(form.contactName || "").trim()) errors.push("contact name");
  if (!String(form.contactEmail || "").trim()) errors.push("contact email");
  else if (!isValidEmail(form.contactEmail)) errors.push("valid contact email");
  if (!form.locationArea) errors.push("sub-city area");
  if (!form.price || Number(form.price) <= 0) errors.push("price");
  else {
    const price = Number(form.price);
    if (form.listingMode === "for_rent" && price < 8000) {
      errors.push("monthly rent (minimum ETB 8,000 — check for typos)");
    }
    if (form.listingMode === "for_sale" && price < 500000) {
      errors.push("sale price (minimum ETB 500,000 — check for typos)");
    }
  }
  if (!form.sizeM2 || Number(form.sizeM2) <= 0) errors.push("unit size");
  if (!isInAddisBounds(form.latitude, form.longitude)) {
    errors.push("map pin inside Addis Ababa");
  }
  return errors;
}

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
  // "camera" | "photo" | "device" | "manual" — once set, the sub-city default no longer moves the pin.
  const [pinSource, setPinSource] = useState(null);
  const [pinNotice, setPinNotice] = useState("");
  const [processingPhotos, setProcessingPhotos] = useState(false);
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
    if (step !== 3) return;
    if (pinSource && isInAddisBounds(form.latitude, form.longitude)) {
      setMapFlyTo({ lat: Number(form.latitude), lng: Number(form.longitude), zoom: 17, token: `${step}-pin` });
      return;
    }
    if (!form.locationArea) return;
    const center = getSubcityCenter(form.locationArea);
    const atDefault =
      Number(form.latitude) === INITIAL_PIN.lat && Number(form.longitude) === INITIAL_PIN.lng;
    if (atDefault || !isInAddisBounds(form.latitude, form.longitude)) {
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
        isInAddisBounds(form.latitude, form.longitude);
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
      const suggestions = (r.data.suggestions || []).filter(isValidTitleSuggestion);
      setTitleSuggestions(suggestions);
      if (suggestions[0]) {
        setField("aiTitleSuggestion", suggestions[0]);
        if (!form.title || !isValidTitleSuggestion(form.title)) setField("title", suggestions[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate title suggestions.");
    } finally {
      setLoadingTitles(false);
    }
  }

  async function loadDescription() {
    setError("");
    try {
      const r = await api.post("/listings/suggest-description", { ...form, rooms: form.bedrooms });
      setAiDescription(r.data.description || "");
    } catch (err) {
      setError(err.response?.data?.message || "Could not generate description.");
    }
  }

  function applyPin({ lat, lng }, source) {
    const safeLat = Number(Number(lat).toFixed(7));
    const safeLng = Number(Number(lng).toFixed(7));
    setForm((prev) => ({ ...prev, latitude: safeLat, longitude: safeLng }));
    setPinSource(source);
    setMapFlyTo({ lat: safeLat, lng: safeLng, zoom: 17, token: Date.now() });
    return { lat: safeLat, lng: safeLng };
  }

  async function addPhotos(files) {
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos. Remove one to add another.`);
      return [];
    }
    setProcessingPhotos(true);
    try {
      const picked = files.slice(0, room);
      const prepared = await Promise.all(
        picked.map((file) => prepareListingPhoto(file, { maxBytes: MAX_IMAGE_BYTES }))
      );
      const failed = picked.filter((_, idx) => !prepared[idx]);
      const ok = prepared.filter(Boolean);
      setError(failed.length ? `Could not use: ${failed.map((f) => f.name).join(", ")} (unsupported or too large).` : "");
      if (ok.length) setImages((prev) => [...prev, ...ok].slice(0, MAX_PHOTOS));
      return picked.filter((_, idx) => prepared[idx]);
    } finally {
      setProcessingPhotos(false);
    }
  }

  async function handleImageSelect(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    const added = await addPhotos(selected);
    if (!added.length || pinSource === "camera") return;
    for (const file of added) {
      const gps = await readExifGps(file);
      if (gps && isInAddisBounds(gps.lat, gps.lng)) {
        const pin = applyPin(gps, "photo");
        setPinNotice(`📍 Location read from your photo (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}). You can adjust it on the map.`);
        return;
      }
    }
  }

  async function handleCameraCapture(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    const added = await addPhotos(selected);
    if (!added.length) return;
    captureLocationWithPhoto();
  }

  function captureLocationWithPhoto() {
    if (!navigator.geolocation) {
      setPinNotice("Your browser can't share its location. Set the pin on the map in the next step.");
      return;
    }
    setPinNotice("📍 Getting the exact location of this photo… please allow location access.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!isInAddisBounds(latitude, longitude)) {
          setPinNotice("This photo was taken outside Addis Ababa, so the location wasn't used. Set the pin on the map in the next step.");
          return;
        }
        const pin = applyPin({ lat: latitude, lng: longitude }, "camera");
        const precision = Number.isFinite(accuracy) ? ` · ±${Math.round(accuracy)} m` : "";
        setPinNotice(`📍 Exact location captured with your photo (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}${precision}).`);
      },
      () => setPinNotice("Location access was blocked. Allow location for mmizan.com, or set the pin on the map in the next step."),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  function removePhoto(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isInAddisBounds(pos.coords.latitude, pos.coords.longitude)) {
          setError(
            "Your current location is outside Addis Ababa. Click or drag the pin on the map to the property's location instead."
          );
          return;
        }
        setError("");
        applyPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "device");
      },
      () => setError("Could not get your location."),
      { enableHighAccuracy: true, timeout: 20000 }
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

    const missing = collectSubmitErrors(form);
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}. Use Back to fix earlier steps if needed.`);
      return;
    }

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
      setPinSource(null);
      setPinNotice("");
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
                  <Input
                    type="number"
                    min={form.listingMode === "for_sale" ? "500000" : "8000"}
                    step="1"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    required
                  />
                  <span className="text-xs text-muted">
                    {form.listingMode === "for_sale"
                      ? "Minimum ETB 500,000 (sale)."
                      : "Minimum ETB 8,000 per month (rent). Double-check typos like 2,500 vs 25,000."}
                  </span>
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
                <div className={`${fieldLabel} col-span-full`}>
                  <span className={labelText}>
                    Photos ({images.length}/{MAX_PHOTOS})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <label
                      className={`inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark ${
                        images.length >= MAX_PHOTOS || processingPhotos ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <span aria-hidden>📷</span> Take photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={handleCameraCapture}
                        disabled={images.length >= MAX_PHOTOS || processingPhotos}
                      />
                    </label>
                    <label
                      className={`inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-brand-muted ${
                        images.length >= MAX_PHOTOS || processingPhotos ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <span aria-hidden>🖼️</span> Upload photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        className="sr-only"
                        onChange={handleImageSelect}
                        disabled={images.length >= MAX_PHOTOS || processingPhotos}
                      />
                    </label>
                  </div>
                  <span className="text-xs text-muted">
                    Best: take the photos on site — we pin the exact location automatically. Or upload up to {MAX_PHOTOS} photos
                    (large phone photos are resized automatically).
                  </span>
                  {processingPhotos ? <span className="text-xs text-muted">Preparing photos…</span> : null}
                  {pinNotice ? (
                    <p className="rounded-lg bg-brand-muted/40 px-3 py-2 text-xs font-medium text-brand-deep" role="status">
                      {pinNotice}
                    </p>
                  ) : null}
                  <PhotoThumbs files={images} onRemove={removePhoto} />
                </div>
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
                        setPinSource("manual");
                      }}
                    />
                  </div>
                  {pinSource === "camera" || pinSource === "photo" ? (
                    <p className="mt-2 text-xs font-medium text-brand-deep">
                      📍 Pin set from your {pinSource === "camera" ? "photo's live location" : "photo's GPS data"} — check it and drag if needed.
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">
                    Pin: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)} · OpenStreetMap
                  </p>
                  {!isInAddisBounds(form.latitude, form.longitude) ? (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      The pin is outside Addis Ababa. Move it to the property's location to continue.
                    </p>
                  ) : null}
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
                    value={
                      titleSuggestions.includes(form.aiTitleSuggestion)
                        ? form.aiTitleSuggestion
                        : titleSuggestions.includes(form.title)
                          ? form.title
                          : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setField("aiTitleSuggestion", value);
                      setField("title", value);
                    }}
                  >
                    <option value="">Select or type below</option>
                    {titleSuggestions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </label>
                <label className={`${fieldLabel} col-span-full`}>
                  <span className={labelText}><RequiredLabel>Listing title</RequiredLabel></span>
                  <Input
                    value={form.title}
                    onChange={(e) => {
                      const value = e.target.value;
                      setField("title", value);
                      setField("aiTitleSuggestion", value);
                    }}
                    required
                  />
                </label>
                <p className="col-span-full text-sm text-muted">
                  Titles are synthesized from hard facts only — no marketing copy from other sites.
                </p>
                <Button type="button" variant="secondary" className="col-span-full" onClick={loadDescription}>
                  Generate AI description
                </Button>
                {aiDescription || step === 4 ? (
                  <label className={`${fieldLabel} col-span-full`}>
                    <span className={labelText}>Description</span>
                    <Textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      rows={5}
                      placeholder="Generate a draft with AI, then edit it here before submitting."
                    />
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
