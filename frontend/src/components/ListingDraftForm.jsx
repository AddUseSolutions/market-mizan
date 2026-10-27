import OsmPinPicker from "./OsmPinPicker";
import { CANONICAL_SUBCITIES } from "../utils/areaOptions";
import { Button, Input, Select, Textarea } from "./ui";

const fieldClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export function draftFromSubmission(s = {}) {
  return {
    title: s.title || "",
    listingMode: s.listing_mode || s.listingMode || "for_rent",
    propertyType: s.property_type || s.propertyType || "",
    propertyCategory: s.property_category || s.propertyCategory || "",
    priceEtb: s.price_etb ?? s.price ?? "",
    sizeM2: s.size_m2 ?? s.property_size_m2 ?? "",
    landAreaM2: s.land_area_m2 ?? "",
    bedrooms: s.bedrooms ?? s.rooms ?? "",
    bathrooms: s.bathrooms ?? "",
    kitchens: s.kitchens ?? "",
    livingRooms: s.living_rooms ?? "",
    locationArea: s.canonical_area || s.location_area || "",
    locationCity: s.location_city || "Addis Ababa",
    availableFrom: s.available_from || "",
    contactName: s.contact_name || "",
    contactPhone: s.contact_phone || "",
    notes: s.description_original || s.notes || s.description || "",
    latitude: s.latitude ?? "",
    longitude: s.longitude ?? ""
  };
}

export function draftFromProperty(property = {}) {
  const status = String(property.property_status || "").toLowerCase();
  return draftFromSubmission({
    ...property,
    listing_mode: status.includes("sale") ? "for_sale" : "for_rent",
    size_m2: property.property_size_m2,
    price_etb: property.price_etb,
    notes: property.description_original || property.description
  });
}

export default function ListingDraftForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  busy,
  error,
  submitLabel,
  showContact = true
}) {
  function set(key, value) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Field label="Title" className="sm:col-span-2">
        <Input className={fieldClass} value={draft.title} onChange={(e) => set("title", e.target.value)} required />
      </Field>
      <Field label="Listing">
        <Select value={draft.listingMode} onChange={(e) => set("listingMode", e.target.value)}>
          <option value="for_rent">For rent</option>
          <option value="for_sale">For sale</option>
        </Select>
      </Field>
      <Field label="Type">
        <Input className={fieldClass} value={draft.propertyType} onChange={(e) => set("propertyType", e.target.value)} required />
      </Field>
      <Field label="Category">
        <Select value={draft.propertyCategory} onChange={(e) => set("propertyCategory", e.target.value)}>
          <option value="">—</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
          <option value="land">Land</option>
        </Select>
      </Field>
      <Field label="Sub-city">
        <Select value={draft.locationArea} onChange={(e) => set("locationArea", e.target.value)} required>
          <option value="">Select…</option>
          {CANONICAL_SUBCITIES.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Price ETB">
        <Input type="number" className={fieldClass} value={draft.priceEtb} onChange={(e) => set("priceEtb", e.target.value)} required />
      </Field>
      <Field label="Living area m²">
        <Input type="number" className={fieldClass} value={draft.sizeM2} onChange={(e) => set("sizeM2", e.target.value)} required />
      </Field>
      <Field label="Land area m²">
        <Input type="number" className={fieldClass} value={draft.landAreaM2} onChange={(e) => set("landAreaM2", e.target.value)} />
      </Field>
      <Field label="Bedrooms">
        <Input type="number" className={fieldClass} value={draft.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
      </Field>
      <Field label="Bathrooms">
        <Input type="number" className={fieldClass} value={draft.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
      </Field>
      <Field label="Kitchens">
        <Input type="number" className={fieldClass} value={draft.kitchens} onChange={(e) => set("kitchens", e.target.value)} />
      </Field>
      <Field label="Living rooms">
        <Input type="number" className={fieldClass} value={draft.livingRooms} onChange={(e) => set("livingRooms", e.target.value)} />
      </Field>
      {showContact ? (
        <>
          <Field label="Contact name">
            <Input className={fieldClass} value={draft.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Field>
          <Field label="Contact phone">
            <Input className={fieldClass} value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </Field>
        </>
      ) : null}
      <Field label="Available from">
        <Input className={fieldClass} value={draft.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <Textarea className="min-h-[96px]" value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Map pin</p>
        <p className="mb-2 text-xs text-muted">Click or drag the pin. This is the location that goes live after approval.</p>
        <OsmPinPicker
          latitude={draft.latitude}
          longitude={draft.longitude}
          areaLabel={draft.locationArea}
          onChange={({ lat, lng }) => onChange({ ...draft, latitude: lat, longitude: lng })}
        />
      </div>
      {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
