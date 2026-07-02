import { useState } from "react";
import api from "../../api";
import { Button } from "../ui";
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

export default function SubmissionReviewCard({ submission, onPublish, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

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
    <li className="rounded-lg border border-line bg-surface p-4 shadow-soft">
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
          <Button size="sm" onClick={() => onPublish(submission.id)}>Approve</Button>
          <Button size="sm" variant="secondary" onClick={() => onReject(submission.id)}>
            Reject
          </Button>
        </div>
      </div>

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
                    <img src={src} alt={`Listing photo ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
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
