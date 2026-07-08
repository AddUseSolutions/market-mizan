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

export default function BrokerDashboardWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/roles/agency/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || "Could not load broker dashboard."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <p className="text-muted">Loading broker portfolio…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return null;

  const stats = data.stats || {};
  const agency = data.profile?.agency_name || "Your agency";

  return (
    <div className="space-y-6 lg:col-span-2">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-brand-deep via-brand-deep to-primary/90 text-white">
        <CardContent className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">Trusted broker</p>
          <h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{agency}</h2>
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
    </div>
  );
}
