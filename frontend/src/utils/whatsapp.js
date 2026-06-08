const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export function getWhatsAppDigits() {
  return WHATSAPP_NUMBER.replace(/\D/g, "");
}

export function buildWhatsAppUrl(text) {
  const digits = getWhatsAppDigits();
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildHolisticServiceMessage(service, property) {
  const title = property?.title || property?.property_id || "—";
  const ref = property?.property_id || "—";
  const link = property?.detail_url || "";

  const lines = [
    "Hello Market Mizan,",
    "",
    "I am interested in holistic services:",
    `• ${service.label} — ${service.desc}`,
    "",
    `Property: ${title}`,
    `Reference: ${ref}`
  ];

  if (link) lines.push(`Link: ${link}`);
  lines.push("", "Rental or purchase — please connect me with the right expert.");

  return lines.join("\n");
}
