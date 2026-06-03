const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export default function WhatsAppFab() {
  if (!WHATSAPP_NUMBER) return null;

  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent("Hello Market Mizan — I have a question about a listing.")}`;

  return (
    <a
      className="whatsapp-fab"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contact us on WhatsApp"
    >
      <span className="whatsapp-fab-icon" aria-hidden>💬</span>
      <span className="whatsapp-fab-label">WhatsApp</span>
    </a>
  );
}
