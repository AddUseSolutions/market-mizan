import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { Container, Section, SectionHeader, Button } from "../components/ui";

export default function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/properties/mine")
      .then((r) => setListings(r.data?.listings || []))
      .catch((e) => setError(e.response?.data?.message || "Could not load your listings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="Account"
          title="Your listings"
          subtitle="Sign in with the email you used to submit. Edits stay private until we approve them again."
        />
        {loading ? <p className="text-muted">Loading…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error && listings.length === 0 ? (
          <p className="text-muted">
            No listings linked to this account yet. Use the same email as on the submission, or{" "}
            <Link to="/list-your-property" className="text-primary hover:underline">
              list a property
            </Link>
            .
          </p>
        ) : null}
        <ul className="space-y-3">
          {listings.map((row) => (
            <li key={row.property_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
              <div>
                <p className="font-semibold text-heading">{row.title}</p>
                <p className="text-sm text-muted">
                  {row.listing_ref} · {row.canonical_area || row.location_area || "Addis Ababa"}
                  {row.pending_review ? " · update waiting for approval" : ""}
                </p>
              </div>
              <Button as={Link} to={`/property/${row.listing_ref || row.property_id}?edit=1`} variant="secondary">
                Edit
              </Button>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
