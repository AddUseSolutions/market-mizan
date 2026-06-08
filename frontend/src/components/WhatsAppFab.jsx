import { buildWhatsAppUrl } from "../utils/whatsapp";

export default function WhatsAppFab() {
  const href =
    buildWhatsAppUrl("Hello Market Mizan — I have a question about a listing.") || "/contact";

  if (href.startsWith("http")) {
    return (
      <a className="whatsapp-fab" href={href} target="_blank" rel="noreferrer" aria-label="Contact us on WhatsApp">
        <span className="whatsapp-fab-icon" aria-hidden>💬</span>
        <span className="whatsapp-fab-label">WhatsApp</span>
      </a>
    );
  }

  return (
    <a className="whatsapp-fab whatsapp-fab-contact" href={href} aria-label="Contact us">
      <span className="whatsapp-fab-icon" aria-hidden>✉</span>
      <span className="whatsapp-fab-label">Contact</span>
    </a>
  );
}
