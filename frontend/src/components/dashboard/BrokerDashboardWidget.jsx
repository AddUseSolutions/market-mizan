import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { Card, CardContent, Button } from "../ui";

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-brand-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-deep">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function NeighborhoodAvgTable({ title, rows }) {
  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold text-brand-deep">{title}</h3>
        {!rows.length ? (
          <p className="mt-3 text-sm text-muted">No averages yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-muted/20 text-left text-xs uppercase text-muted">
                  <th className="px-3 py-2">Neighborhood</th>
                  <th className="px-3 py-2">Avg ETB</th>
                  <th className="px-3 py-2">Avg USD</th>
                  <th className="px-3 py-2">Listings</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${title}-${row.neighborhood}`} className="border-t border-line">
                    <td className="px-3 py-2">{row.neighborhood}</td>
                    <td className="px-3 py-2">
                      {row.avg_price_etb != null ? Number(row.avg_price_etb).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.avg_price_usd != null ? `$${Number(row.avg_price_usd).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-3 py-2">{row.listing_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BrokerDashboardWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editableListings, setEditableListings] = useState([]);
  const [editState, setEditState] = useState({
    property_id: "",
    title: "",
    price_etb: "",
    price_usd: "",
    property_status: ""
  });
  const [savingId, setSavingId] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/roles/agency/dashboard"),
      api.get("/roles/agency/listings/editable")
    ])
      .then(([dashboardRes, listingsRes]) => {
        setData(dashboardRes.data);
        setEditableListings(listingsRes.data?.listings || []);
      })
      .catch((e) => setError(e.response?.data?.message || "Could not load broker dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdit() {
    if (!editState.property_id || !editState.title.trim()) return;
    setSavingId(editState.property_id);
    try {
      await api.patch(`/roles/agency/listings/${encodeURIComponent(editState.property_id)}`, {
        title: editState.title,
        price_etb: editState.price_etb || null,
        price_usd: editState.price_usd || null,
        property_status: editState.property_status || null
      });
      setEditState({ property_id: "", title: "", price_etb: "", price_usd: "", property_status: "" });
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not update listing.");
    } finally {
      setSavingId("");
    }
  }

  if (loading && !data) return <p className="text-muted">Loading broker portfolio…</p>;
  if (error && !data) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return null;

  const stats = data.stats || {};
  const agency = data.profile?.agency_name || "Your agency";
  const shortName = data.profile?.short_name || "";
  const avgRows = data.avgPriceByNeighborhood || [];
  const rentRows = avgRows.filter((r) => r.listing_mode === "rent");
  const saleRows = avgRows.filter((r) => r.listing_mode === "sale");

  return (
    <div className="space-y-6 lg:col-span-2">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-brand-deep via-brand-deep to-primary/90 text-white">
        <CardContent className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Trusted broker</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">
            {agency}
            {shortName ? <span className="ml-2 text-sm font-semibold text-primary">({shortName})</span> : null}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            Your listings publish instantly as verified on Market Mizan — built for investors who expect
            transparency, speed, and a professional portfolio view.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button as={Link} to="/list-your-property" variant="primary-gold">
              Add verified listing
            </Button>
            <Button variant="secondary" onClick={load} disabled={loading}>
              Refresh portfolio
            </Button>
          </div>
          {stats.autoVerifyEnabled ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Auto-verify enabled — listings go live immediately
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active listings" value={stats.activeListings ?? 0} />
        <StatTile label="Verified live" value={stats.verifiedListings ?? 0} />
        <StatTile
          label="Portfolio value"
          value={stats.portfolioValueUsd != null ? `$${Number(stats.portfolioValueUsd).toLocaleString()}` : "—"}
          hint="USD equivalent"
        />
        <StatTile
          label="Avg. listing price"
          value={stats.avgPriceUsd != null ? `$${Number(stats.avgPriceUsd).toLocaleString()}` : "—"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NeighborhoodAvgTable title="Average price per neighborhood (Rent)" rows={rentRows} />
        <NeighborhoodAvgTable title="Average price per neighborhood (Sale)" rows={saleRows} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="font-semibold text-brand-deep">Listings by area</h3>
            {!data.areaBreakdown?.length ? (
              <p className="mt-3 text-sm text-muted">No listings yet — add your first property.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.areaBreakdown.map((row) => (
                  <li key={row.area} className="flex items-center justify-between text-sm">
                    <span className="text-brand-deep">{row.area}</span>
                    <span className="font-semibold text-primary">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="font-semibold text-brand-deep">Recent listings</h3>
            {!data.recentListings?.length ? (
              <p className="mt-3 text-sm text-muted">Nothing published yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {data.recentListings.map((listing) => (
                  <li key={listing.property_id} className="py-3 first:pt-0">
                    <Link
                      to={`/property/${listing.property_id}`}
                      className="block font-medium text-brand-deep hover:text-primary"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {listing.location_area || "Addis Ababa"}
                      {listing.price_usd != null ? ` · $${Math.round(Number(listing.price_usd)).toLocaleString()}` : ""}
                      {listing.verification_status === "verified" ? " · Verified" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-brand-deep">Editable listings (including Just Property for EPM)</h3>
          {!editableListings.length ? (
            <p className="mt-3 text-sm text-muted">No editable listings found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-muted/20 text-left text-xs uppercase text-muted">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {editableListings.map((listing) => (
                    <tr key={listing.property_id} className="border-t border-line">
                      <td className="px-3 py-2">{listing.property_id}</td>
                      <td className="px-3 py-2">{listing.title}</td>
                      <td className="px-3 py-2">{listing.source_name || listing.source_website}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() =>
                            setEditState({
                              property_id: listing.property_id,
                              title: listing.title || "",
                              price_etb: listing.price_etb != null ? String(listing.price_etb) : "",
                              price_usd: listing.price_usd != null ? String(listing.price_usd) : "",
                              property_status: listing.property_status || ""
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editState.property_id ? (
            <div className="mt-4 grid gap-3 rounded-xl border border-line bg-brand-muted/10 p-4 md:grid-cols-2">
              <input
                className="rounded-lg border border-line px-3 py-2"
                value={editState.title}
                onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                placeholder="Title"
              />
              <input
                className="rounded-lg border border-line px-3 py-2"
                value={editState.property_status}
                onChange={(e) => setEditState((s) => ({ ...s, property_status: e.target.value }))}
                placeholder="Property status (For Rent / For Sale)"
              />
              <input
                type="number"
                className="rounded-lg border border-line px-3 py-2"
                value={editState.price_etb}
                onChange={(e) => setEditState((s) => ({ ...s, price_etb: e.target.value }))}
                placeholder="Price ETB"
              />
              <input
                type="number"
                className="rounded-lg border border-line px-3 py-2"
                value={editState.price_usd}
                onChange={(e) => setEditState((s) => ({ ...s, price_usd: e.target.value }))}
                placeholder="Price USD"
              />
              <div className="flex gap-2 md:col-span-2">
                <Button variant="primary-gold" onClick={saveEdit} disabled={savingId === editState.property_id}>
                  {savingId === editState.property_id ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setEditState({ property_id: "", title: "", price_etb: "", price_usd: "", property_status: "" })
                  }
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
