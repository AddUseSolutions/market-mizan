import { useEffect, useState } from "react";
import api from "../api";
import { Button } from "./ui";

/**
 * Inline editor for AGENCY_BROKER assigned listings (and EPM Just Property).
 * Saves via PATCH /roles/agency/listings/:property_id
 */
export default function BrokerListingEditPanel({ property, onSaved }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    property_status: "",
    price_etb: "",
    price_usd: "",
    location_area: "",
    location_city: ""
  });

  useEffect(() => {
    if (!property) return;
    setForm({
      title: property.title || "",
      property_status: property.property_status || "",
      price_etb: property.price_etb != null ? String(property.price_etb) : "",
      price_usd: property.price_usd != null ? String(property.price_usd) : "",
      location_area: property.location_area || "",
      location_city: property.location_city || ""
    });
    setError("");
  }, [property?.property_id, property?.title, property?.price_etb, property?.price_usd, property?.property_status, property?.location_area, property?.location_city]);

  if (!property?.can_edit || !property?.property_id) return null;

  async function save() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/roles/agency/listings/${encodeURIComponent(property.property_id)}`, {
        title: form.title.trim(),
        property_status: form.property_status || null,
        price_etb: form.price_etb || null,
        price_usd: form.price_usd || null,
        location_area: form.location_area || null,
        location_city: form.location_city || null
      });
      setOpen(false);
      if (typeof onSaved === "function") onSaved();
    } catch (e) {
      setError(e.response?.data?.message || "Could not update listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/25 bg-brand-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Assigned listing</p>
          <p className="text-sm text-brand-deep">Edit title, status, location, and prices.</p>
        </div>
        {!open ? (
          <Button type="button" variant="primary-gold" onClick={() => setOpen(true)}>
            Edit listing
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
            Close
          </Button>
        )}
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">Title</span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Status</span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.property_status}
              onChange={(e) => setForm((s) => ({ ...s, property_status: e.target.value }))}
              placeholder="For Rent / For Sale"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Area / neighborhood</span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.location_area}
              onChange={(e) => setForm((s) => ({ ...s, location_area: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">City</span>
            <input
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.location_city}
              onChange={(e) => setForm((s) => ({ ...s, location_city: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Price ETB</span>
            <input
              type="number"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.price_etb}
              onChange={(e) => setForm((s) => ({ ...s, price_etb: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Price USD</span>
            <input
              type="number"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2"
              value={form.price_usd}
              onChange={(e) => setForm((s) => ({ ...s, price_usd: e.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" variant="primary-gold" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
