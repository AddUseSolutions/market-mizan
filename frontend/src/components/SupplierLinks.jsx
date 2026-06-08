const SERVICES = [
  { label: "Property management", desc: "Tenant & maintenance support" },
  { label: "Interior design", desc: "Staging and renovation" },
  { label: "Craftsmanship", desc: "Repairs and build-out" },
  { label: "Mortgage / bank", desc: "Financing options" },
  { label: "Insurance", desc: "Property coverage" }
];

export default function SupplierLinks({ onServiceRequest }) {
  return (
    <section className="supplier-links">
      <h2 className="detail-section-title">Holistic services</h2>
      <p className="supplier-links-lead">
        Rental or purchase — tell us what you need and our team will connect you with the right experts.
      </p>
      <div className="supplier-grid">
        {SERVICES.map((s) => (
          <button
            key={s.label}
            type="button"
            className="supplier-card"
            onClick={() => onServiceRequest?.(s)}
          >
            <strong>{s.label}</strong>
            <span>{s.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
