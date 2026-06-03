const EPM_URL = "https://epmglobal.net/";

const SUPPLIERS = [
  { label: "Property management", href: EPM_URL, desc: "Tenant & maintenance support" },
  { label: "Interior design", href: EPM_URL, desc: "Staging and renovation" },
  { label: "Craftsmanship", href: EPM_URL, desc: "Repairs and build-out" },
  { label: "Mortgage / bank", href: EPM_URL, desc: "Financing options" },
  { label: "Insurance", href: EPM_URL, desc: "Property coverage" }
];

export default function SupplierLinks() {
  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">Holistic services</h2>
      <p className="supplier-links-lead">
        Rental or purchase — connect with trusted partners at{" "}
        <a href={EPM_URL} target="_blank" rel="noreferrer">EPM Real Estate Solutions</a>.
      </p>
      <div className="supplier-grid">
        {SUPPLIERS.map((s) => (
          <a key={s.label} href={s.href} className="supplier-card" target="_blank" rel="noreferrer">
            <strong>{s.label}</strong>
            <span>{s.desc}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
