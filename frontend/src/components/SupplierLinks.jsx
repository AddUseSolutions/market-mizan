const SUPPLIERS = [
  { label: "Property management", href: "/contact?topic=property-management", desc: "Tenant & maintenance support" },
  { label: "Interior design", href: "/contact?topic=interior-design", desc: "Staging and renovation" },
  { label: "Craftsmanship", href: "/contact?topic=craftsmanship", desc: "Repairs and build-out" },
  { label: "Mortgage / bank", href: "/contact?topic=bank", desc: "Financing options" },
  { label: "Insurance", href: "/contact?topic=insurance", desc: "Property coverage" }
];

export default function SupplierLinks() {
  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">Holistic services</h2>
      <p className="muted-inline">Rental or purchase — connect with trusted partners.</p>
      <div className="supplier-grid">
        {SUPPLIERS.map((s) => (
          <a key={s.label} href={s.href} className="supplier-card">
            <strong>{s.label}</strong>
            <span>{s.desc}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
