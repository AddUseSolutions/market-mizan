const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export default function WhatsAppFab() {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  if (digits) {
    const href = `https://wa.me/${digits}?text=${encodeURIComponent("Hello Market Mizan — I have a question about a listing.")}`;
    return (
      <a className="whatsapp-fab" href={href} target="_blank" rel="noreferrer" aria-label="Contact us on WhatsApp">
        <span className="whatsapp-fab-icon" aria-hidden>💬</span>
        <span className="whatsapp-fab-label">WhatsApp</span>
      </a>
    );
  }
  return (
    <a className="whatsapp-fab whatsapp-fab-contact" href="/contact" aria-label="Contact us">
      <span className="whatsapp-fab-icon" aria-hidden>✉</span>
      <span className="whatsapp-fab-label">Contact</span>
    </a>
  );
}
