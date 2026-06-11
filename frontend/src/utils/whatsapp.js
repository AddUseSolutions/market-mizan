const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";

export function getWhatsAppDigits() {
  return WHATSAPP_NUMBER.replace(/\D/g, "");
}

export function buildWhatsAppUrl(text) {
  const digits = getWhatsAppDigits();
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function buildPropertyInquiryMessage(property, addressLine) {
  const title = property?.title || property?.property_id || "—";
  const ref = property?.property_id || "—";
  const link =
    property?.detail_url ||
    (typeof window !== "undefined" && property?.property_id
      ? `${window.location.origin}/property/${property.property_id}`
      : "");

  const lines = [
    "Hello Market Mizan,",
    "",
    "I have a question about this property:",
    title,
    `Reference: ${ref}`
  ];

  if (addressLine) lines.push(`Location: ${addressLine}`);
  if (link) lines.push(`Link: ${link}`);

  return lines.join("\n");
}

export function buildContactFormWhatsAppMessage({
  firstName,
  lastName,
  email,
  phone,
  message,
  property,
  addressLine,
  serviceLabel
}) {
  const title = property?.title || property?.property_id || "—";
  const ref = property?.property_id || "—";
  const link =
    property?.detail_url ||
    (typeof window !== "undefined" && property?.property_id
      ? `${window.location.origin}/property/${property.property_id}`
      : "");

  const lines = [
    "Hello Market Mizan,",
    "",
    `Name: ${firstName} ${lastName}`.trim(),
    `Email: ${email}`
  ];

  if (phone?.trim()) lines.push(`Phone: ${phone.trim()}`);
  if (serviceLabel) lines.push(`Service: ${serviceLabel}`);
  lines.push("", `Property: ${title}`, `Reference: ${ref}`);
  if (addressLine) lines.push(`Location: ${addressLine}`);
  if (link) lines.push(`Link: ${link}`);
  lines.push("", message?.trim() || "I am interested in this property.");

  return lines.join("\n");
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
