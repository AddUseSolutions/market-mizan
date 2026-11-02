import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ListingBrowseMap from "../components/ListingBrowseMap";
import { Container, Section } from "../components/ui";
import { cn } from "../utils/cn";
import { placeListingPins, pinInBounds } from "../utils/listingMapPins";
import { getPriceLines } from "../utils/pricing";

const LIST_CAP = 40;

function bedroomLabel(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 30) return "";
  return n === 1 ? "1 bedroom" : `${n} bedrooms`;
}

function ListingRow({ pin, selected, onSelect }) {
  const price = getPriceLines(pin);
  const place = [pin.location_area, pin.area].filter((part, index, all) => part && all.indexOf(part) === index).join(", ");
  return (
    <Link
      to={`/property/${encodeURIComponent(pin.property_id)}`}
      data-map-listing={pin.property_id}
      onMouseEnter={() => onSelect(pin.property_id)}
      onFocus={() => onSelect(pin.property_id)}
      className={cn(
        "flex gap-3 rounded-2xl border bg-surface p-3 transition-colors",
        selected ? "border-primary ring-2 ring-primary/30" : "border-line hover:border-primary/40"
      )}
    >
      {pin.images?.[0] ? (
        <img src={pin.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="h-20 w-24 shrink-0 rounded-xl bg-line/40" />
      )}
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-semibold text-heading">{pin.title}</span>
        <span className="mt-1 block text-sm font-semibold text-brand-deep">
          {price.onRequest ? "Price on request" : price.usd || price.etb}
        </span>
        <span className="mt-1 block text-xs text-muted">
          {[place, bedroomLabel(pin.bedrooms), pin.approximate ? "area pin" : ""].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}

export default function NeighborhoodMapPage() {
  const [listingType, setListingType] = useState("rent");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [capped, setCapped] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSelectedId("");
    api
      .get("/map-listings", { params: { listing_mode: listingType === "sale" ? "for_sale" : "for_rent" } })
      .then((response) => {
        if (cancelled) return;
        const data = response.data || {};
        setListings(Array.isArray(data.listings) ? data.listings : []);
        setCapped(Boolean(data.capped));
      })
      .catch(() => {
        if (!cancelled) {
          setListings([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingType]);

  const pins = useMemo(() => placeListingPins(listings), [listings]);
  const inView = useMemo(() => pins.filter((pin) => pinInBounds(pin, bounds)), [pins, bounds]);
  const rows = useMemo(() => {
    const selected = inView.find((pin) => pin.property_id === selectedId);
    const rest = inView.filter((pin) => pin.property_id !== selectedId).slice(0, selected ? LIST_CAP - 1 : LIST_CAP);
    return selected ? [selected, ...rest] : rest;
  }, [inView, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(`[data-map-listing="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, rows]);

  const modeBtn = (active) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      active ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary border border-line"
    );

  return (
    <Section>
      <Container>
        <h1 className="text-3xl font-bold text-heading">Homes on the map</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Choose a price to open that home. A number groups several homes until you zoom in.
          Homes without an exact address sit in their sub-city.
        </p>

        <div className="mt-6 inline-flex rounded-lg border border-line p-1" role="tablist" aria-label="Listing type">
          <button type="button" role="tab" aria-selected={listingType === "rent"} className={modeBtn(listingType === "rent")} onClick={() => setListingType("rent")}>
            Rent
          </button>
          <button type="button" role="tab" aria-selected={listingType === "sale"} className={modeBtn(listingType === "sale")} onClick={() => setListingType("sale")}>
            Sale
          </button>
        </div>

        {loading ? <p className="mt-4 text-muted">Loading homes…</p> : null}
        {failed ? <p className="mt-4 text-muted">The map could not load homes. Refresh the page.</p> : null}
        {!loading && !failed ? (
          <p className="mt-4 text-sm text-muted">
            {pins.length} {listingType === "sale" ? "sale" : "rental"} homes
            {capped ? " (first 4,000)" : ""}
            {bounds ? ` · ${inView.length} in this view` : ""}
          </p>
        ) : null}

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="order-2 flex max-h-[70vh] flex-col gap-3 overflow-y-auto lg:order-1">
            {rows.map((pin) => (
              <ListingRow key={pin.property_id} pin={pin} selected={pin.property_id === selectedId} onSelect={setSelectedId} />
            ))}
            {!loading && rows.length === 0 ? <p className="text-sm text-muted">No homes in this part of the map.</p> : null}
          </div>
          <div className="order-1 lg:order-2">
            <ListingBrowseMap pins={pins} selectedId={selectedId} onSelect={setSelectedId} onView={setBounds} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
