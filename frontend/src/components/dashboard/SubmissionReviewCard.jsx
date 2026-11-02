import { useEffect, useState } from "react";
import api from "../../api";
import { Button, Select, Textarea } from "../ui";
import ListingDraftForm, { draftFromSubmission } from "../ListingDraftForm";
import { approvalMessage, rejectionMessage } from "../../utils/approvalMessage";
import { REJECTION_REASONS } from "../../utils/rejectionReasons";
import { dashMuted } from "./DashboardWidget";

function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function formatEtb(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `ETB ${Math.round(n).toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function DetailRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-brand-deep">{value}</dd>
    </div>
  );
}

const PUBLIC_PHOTO_MAX = 6;

function ApprovePanel({ submission, onDone, onCancel }) {
  const [publisherType, setPublisherType] = useState("landlord");
  const [isPaid, setIsPaid] = useState(false);
  const [photos, setPhotos] = useState(() => parseImages(submission.images));
  const [selected, setSelected] = useState(() =>
    parseImages(submission.images)
      .map((_, index) => index)
      .slice(0, PUBLIC_PHOTO_MAX)
  );
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (parseImages(submission.images).length || !submission.id) return undefined;
    let cancelled = false;
    setLoadingPhotos(true);
    api
      .get(`/admin/submissions/${submission.id}`)
      .then((response) => {
        if (cancelled) return;
        const list = parseImages(response.data?.images);
        setPhotos(list);
        setSelected(list.map((_, index) => index).slice(0, PUBLIC_PHOTO_MAX));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the uploaded photos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPhotos(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submission.id, submission.images]);

  function togglePhoto(index) {
    setSelected((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      if (current.length >= PUBLIC_PHOTO_MAX) return current;
      return [...current, index];
    });
  }

  function movePhoto(index, direction) {
    setSelected((current) => {
      const position = current.indexOf(index);
      const next = position + direction;
      if (position < 0 || next < 0 || next >= current.length) return current;
      const copy = current.slice();
      const [item] = copy.splice(position, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  async function confirm() {
    if (photos.length && !selected.length) {
      setError("Choose at least one photo to show. Up to 6 can be visible.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`/admin/submissions/${submission.id}/publish`, {
        publisherType,
        isPaid,
        imageIndexes: selected
      });
      onDone(approvalMessage(r.data));
    } catch (e) {
      setError(e.response?.data?.message || "Approve failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-heading">Approve this listing</p>
      <p className={`mt-1 text-xs ${dashMuted}`}>
        Pick the photos standard visitors will see, in the order they should appear. Up to {PUBLIC_PHOTO_MAX} of{" "}
        {photos.length || "the uploaded"} photos.
      </p>
      {loadingPhotos ? <p className={`mt-3 text-sm ${dashMuted}`}>Loading photos…</p> : null}
      {photos.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {photos.map((src, index) => {
            const order = selected.indexOf(index);
            const on = order >= 0;
            return (
              <div key={`${submission.id}-pick-${index}`} className="min-w-0">
                <button
                  type="button"
                  onClick={() => togglePhoto(index)}
                  disabled={busy}
                  aria-pressed={on}
                  className={`relative block w-full overflow-hidden rounded-lg border ${on ? "border-primary ring-2 ring-primary" : "border-line opacity-60"}`}
                >
                  <img src={src} alt={`Uploaded photo ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-deep px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {on ? order + 1 : "Hide"}
                  </span>
                </button>
                {on ? (
                  <div className="mt-1 flex gap-1">
                    <button type="button" className="rounded border border-line px-2 py-0.5 text-xs" disabled={busy || order === 0} onClick={() => movePhoto(index, -1)}>
                      Earlier
                    </button>
                    <button type="button" className="rounded border border-line px-2 py-0.5 text-xs" disabled={busy || order === selected.length - 1} onClick={() => movePhoto(index, 1)}>
                      Later
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {photos.length ? (
        <p className="mt-2 text-xs font-medium text-brand-deep">
          {selected.length} visible · {photos.length} uploaded · maximum {PUBLIC_PHOTO_MAX}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Publisher</span>
          <Select value={publisherType} onChange={(e) => setPublisherType(e.target.value)} disabled={busy}>
            <option value="landlord">Owner / landlord</option>
            <option value="broker">Broker / agency</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-brand-deep">
          <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={busy} />
          Paid listing
        </label>
      </div>
      <p className={`mt-3 text-xs ${dashMuted}`}>
        Goes live with the ✔ Verified badge. {submission.contact_email || "The submitter"} gets an approval email from
        hello@mmizan.com with the MM reference.
      </p>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={confirm} disabled={busy || loadingPhotos || (photos.length > 0 && selected.length === 0)}>
          {busy ? "Approving…" : "Approve & send email"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RejectPanel({ submission, onDone, onCancel }) {
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsNote = reasonCode === "other";
  const canSubmit = reasonCode && (!needsNote || note.trim());

  async function confirm() {
    if (!canSubmit) {
      setError(needsNote ? "Please write the reason." : "Please choose a reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`/admin/submissions/${submission.id}/reject`, {
        reasonCode,
        note: note.trim(),
        notify
      });
      onDone(rejectionMessage(r.data));
    } catch (e) {
      setError(e.response?.data?.message || "Reject failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-heading">Reject this listing</p>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Reason</span>
        <Select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} disabled={busy}>
          <option value="">Choose a reason…</option>
          {REJECTION_REASONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          {needsNote ? "Reason (required)" : "Note to the submitter (optional)"}
        </span>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          maxLength={1000}
          className="min-h-[72px]"
          placeholder={needsNote ? "Explain why the listing cannot be published" : "e.g. Please add photos of the kitchen and bathroom"}
        />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm text-brand-deep">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={busy} />
        Email the reason to {submission.contact_email || "the submitter"}
      </label>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" onClick={confirm} disabled={busy || !canSubmit}>
          {busy ? "Rejecting…" : notify ? "Reject & send email" : "Reject"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SubmissionReviewCard({ submission, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function toggleAction(next) {
    setAction((current) => (current === next ? null : next));
  }

  function handleDone(message) {
    setAction(null);
    onResolved?.(submission.id, message);
  }

  const s = detail || submission;
  const images = expanded ? parseImages(s.images) : [];
  const imageCount = Number(submission.image_count ?? parseImages(submission.images).length) || 0;
  const mapUrl =
    s.latitude != null && s.longitude != null
      ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}&z=16`
      : null;

  async function startEdit() {
    setEditError("");
    setExpanded(true);
    let source = detail;
    if (!source || source.id !== submission.id) {
      setLoading(true);
      try {
        const r = await api.get(`/admin/submissions/${submission.id}`);
        source = r.data;
        setDetail(r.data);
      } catch {
        source = submission;
        setDetail(submission);
      } finally {
        setLoading(false);
      }
    }
    setDraft(draftFromSubmission(source));
    setEditing(true);
    setAction(null);
  }

  async function saveEdit() {
    setSaving(true);
    setEditError("");
    try {
      const r = await api.patch(`/admin/submissions/${submission.id}`, draft);
      setDetail(r.data);
      setDraft(draftFromSubmission(r.data));
      setEditing(false);
    } catch (e) {
      setEditError(e.response?.data?.message || "Could not save the listing.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDetails() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (detail?.id === submission.id) return;
    setLoading(true);
    try {
      const r = await api.get(`/admin/submissions/${submission.id}`);
      setDetail(r.data);
    } catch {
      setDetail(submission);
    } finally {
      setLoading(false);
    }
  }

  const description =
    s.description_summary || s.ai_description || s.description_original || s.notes || null;

  return (
    <li
      id={`submission-${submission.id}`}
      className="rounded-lg border border-line bg-surface p-4 shadow-soft transition-shadow"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 text-sm">
          <strong className="block text-base text-heading">{s.title}</strong>
          {s.published_property_id ? (
            <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Update to live listing
            </span>
          ) : null}
          <span className={dashMuted}>
            {s.property_type?.replace(/_/g, " ")} · {s.listing_mode?.replace(/_/g, " ")} ·{" "}
            {formatEtb(s.price_etb || s.price)}
          </span>
          <span className={`mt-1 block ${dashMuted}`}>
            {s.location_area || s.location_city || "Addis Ababa"}
            {s.bedrooms != null ? ` · ${s.bedrooms} bed` : s.rooms != null ? ` · ${s.rooms} bed` : ""}
            {s.bathrooms != null ? ` · ${s.bathrooms} bath` : ""}
            {s.size_m2 ? ` · ${s.size_m2} m²` : ""}
          </span>
          <span className={`mt-1 block ${dashMuted}`}>
            {s.contact_name} · {s.contact_email}
            {s.contact_phone ? ` · ${s.contact_phone}` : ""}
          </span>
          <span className={`mt-1 block text-xs ${dashMuted}`}>
            Submitted {formatDate(s.created_at)}
            {imageCount ? ` · ${imageCount} photo${imageCount === 1 ? "" : "s"}` : ""}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant={editing ? "outline-gold" : "secondary"} onClick={startEdit}>
            {loading && !detail ? "Loading…" : editing ? "Editing" : "Edit"}
          </Button>
          <Button size="sm" variant="secondary" onClick={toggleDetails}>
            {expanded ? "Hide details" : "View details"}
          </Button>
          <Button size="sm" variant={action === "approve" ? "outline-gold" : "primary"} onClick={() => toggleAction("approve")}>
            Approve
          </Button>
          <Button size="sm" variant={action === "reject" ? "destructive" : "secondary"} onClick={() => toggleAction("reject")}>
            Reject
          </Button>
        </div>
      </div>

      {editing && draft ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-heading">Edit everything, then approve</p>
          <p className={`mt-1 text-xs ${dashMuted}`}>
            Changes are saved on this submission. Approving publishes exactly what you saved, including the map pin.
          </p>
          <ListingDraftForm
            draft={draft}
            onChange={setDraft}
            onSubmit={saveEdit}
            onCancel={() => setEditing(false)}
            busy={saving}
            error={editError}
            submitLabel="Save edits"
          />
        </div>
      ) : null}

      {action === "approve" ? (
        <ApprovePanel submission={s} onDone={handleDone} onCancel={() => setAction(null)} />
      ) : null}
      {action === "reject" ? (
        <RejectPanel submission={s} onDone={handleDone} onCancel={() => setAction(null)} />
      ) : null}

      {expanded ? (
        <div className="mt-4 border-t border-line pt-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Category" value={s.property_category?.replace(/_/g, " ")} />
            <DetailRow label="Available from" value={s.available_from} />
            <DetailRow label="Land size" value={s.land_area_m2 ? `${s.land_area_m2} m²` : null} />
            <DetailRow label="Kitchens" value={s.kitchens} />
            <DetailRow label="Living rooms" value={s.living_rooms} />
            <DetailRow
              label="Maid quarter"
              value={
                s.maid_bedrooms || s.maid_bathrooms
                  ? `${s.maid_bedrooms || 0} bed · ${s.maid_bathrooms || 0} bath`
                  : null
              }
            />
            <DetailRow
              label="Map pin"
              value={
                mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                  </a>
                ) : null
              }
            />
            <DetailRow label="USD price" value={s.price_usd ? `$${Math.round(Number(s.price_usd)).toLocaleString()}` : null} />
          </dl>

          {description ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-brand-deep">{description}</p>
            </div>
          ) : null}

          {s.notes && s.notes !== description ? (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Uploader notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-brand-deep">{s.notes}</p>
            </div>
          ) : null}

          {images.length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Photos</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {images.map((src, index) => (
                  <a
                    key={`${submission.id}-img-${index}`}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-line"
                  >
                    <img
                      src={src}
                      alt={`Listing photo ${index + 1}`}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : imageCount > 0 && loading ? (
            <p className={`mt-4 ${dashMuted}`}>Loading photos…</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
