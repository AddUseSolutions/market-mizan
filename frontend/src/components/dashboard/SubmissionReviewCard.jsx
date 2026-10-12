import { useState } from "react";
import api from "../../api";
import { Button, Select, Textarea } from "../ui";
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

function ApprovePanel({ submission, onDone, onCancel }) {
  const [publisherType, setPublisherType] = useState("landlord");
  const [isPaid, setIsPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const r = await api.post(`/admin/submissions/${submission.id}/publish`, { publisherType, isPaid });
      onDone(approvalMessage(r.data));
    } catch (e) {
      setError(e.response?.data?.message || "Approve failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-heading">Approve this listing</p>
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
        <Button size="sm" onClick={confirm} disabled={busy}>
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
      ? `https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=16/${s.latitude}/${s.longitude}`
      : null;

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
          <Button size="sm" variant="secondary" onClick={toggleDetails}>
            {loading ? "Loading…" : expanded ? "Hide details" : "View details"}
          </Button>
          <Button size="sm" variant={action === "approve" ? "outline-gold" : "primary"} onClick={() => toggleAction("approve")}>
            Approve
          </Button>
          <Button size="sm" variant={action === "reject" ? "destructive" : "secondary"} onClick={() => toggleAction("reject")}>
            Reject
          </Button>
        </div>
      </div>

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
