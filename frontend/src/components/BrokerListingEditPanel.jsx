import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { Button } from "./ui";
import ListingDraftForm, { draftFromProperty } from "./ListingDraftForm";

/**
 * Owner editor. Saves a pending revision (admin must approve before it goes live).
 * Opens automatically when URL has ?edit=1
 */
export default function BrokerListingEditPanel({ property, onSaved }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const wantEdit = searchParams.get("edit") === "1" || searchParams.get("edit") === "true";
  const [open, setOpen] = useState(wantEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(null);
  const needsReview = property?.listing_origin === "verified" || String(property?.source_website || "").includes("market-mizan");

  useEffect(() => {
    if (!property) return;
    setDraft(draftFromProperty(property));
    setError("");
  }, [property?.property_id]);

  useEffect(() => {
    if (wantEdit && property?.can_edit) {
      setOpen(true);
      requestAnimationFrame(() => {
        document.getElementById("listing-edit-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [wantEdit, property?.can_edit, property?.property_id]);

  if (!property?.can_edit || !property?.property_id || !draft) return null;

  function closeEdit() {
    setOpen(false);
    if (wantEdit) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (needsReview) {
        const r = await api.post(`/properties/${encodeURIComponent(property.property_id)}/revision`, draft);
        setNotice(r.data?.message || "Submitted for approval.");
        closeEdit();
      } else {
        await api.patch(`/roles/agency/listings/${encodeURIComponent(property.property_id)}`, {
          title: draft.title,
          property_status: draft.listingMode === "for_sale" ? "For Sale" : "For Rent",
          price_etb: draft.priceEtb || null,
          location_area: draft.locationArea || null,
          location_city: draft.locationCity || null
        });
        closeEdit();
        if (typeof onSaved === "function") onSaved();
      }
    } catch (e) {
      setError(e.response?.data?.message || "Could not update listing.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="listing-edit-panel" className="rounded-lg border border-primary/25 bg-brand-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Your listing</p>
          <p className="text-sm text-brand-deep">
            {needsReview
              ? "Edit any detail or the map pin. We review the change before it replaces the live listing."
              : "Edit title, status, location, and prices."}
          </p>
        </div>
        {!open ? (
          <Button type="button" variant="primary-gold" onClick={() => setOpen(true)}>
            Edit listing
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={closeEdit} disabled={saving}>
            Close
          </Button>
        )}
      </div>
      {notice ? <p className="mt-3 text-sm text-success">{notice}</p> : null}
      {open && needsReview ? (
        <ListingDraftForm
          draft={draft}
          onChange={setDraft}
          onSubmit={save}
          onCancel={closeEdit}
          busy={saving}
          error={error}
          submitLabel="Submit for approval"
          showContact={false}
        />
      ) : null}
      {open && !needsReview ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">Title</span>
            <input className="w-full rounded-lg border border-line bg-surface px-3 py-2" value={draft.title} onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Area</span>
            <input className="w-full rounded-lg border border-line bg-surface px-3 py-2" value={draft.locationArea} onChange={(e) => setDraft((s) => ({ ...s, locationArea: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Price ETB</span>
            <input type="number" className="w-full rounded-lg border border-line bg-surface px-3 py-2" value={draft.priceEtb} onChange={(e) => setDraft((s) => ({ ...s, priceEtb: e.target.value }))} />
          </label>
          <div className="sm:col-span-2">
            <Button type="button" variant="primary-gold" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
