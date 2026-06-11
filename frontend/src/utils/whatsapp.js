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

  const lines = [
    "Hello Market Mizan,",
    "",
    "I have a question about this property:",
    title,
    `Reference: ${ref}`
  ];

  if (addressLine) lines.push(`Location: ${addressLine}`);

  return lines.join("\n");
}

export function buildPropertyFormPrefillMessage(property, addressLine) {
  const title = property?.title || property?.property_id || "—";
  const ref = property?.property_id || "—";

  const lines = [
    "Hello Market Mizan,",
    "",
    "I am interested in this property:",
    "",
    `Property: ${title}`,
    `Reference: ${ref}`
  ];

  if (addressLine) lines.push(`Location: ${addressLine}`);
  lines.push("", "");

  return lines.join("\n");
}

export function buildContactFormWhatsAppMessage({
  firstName,
  lastName,
  email,
  phone,
  message,
  serviceLabel
}) {
  const lines = [
    "Hello Market Mizan,",
    "",
    `Name: ${firstName} ${lastName}`.trim(),
    `Email: ${email}`
  ];

  if (phone?.trim()) lines.push(`Phone: ${phone.trim()}`);
  if (serviceLabel) lines.push(`Service: ${serviceLabel}`);
  lines.push("", message?.trim() || "I am interested in this property.");

  return lines.join("\n");
}

export function buildHolisticServiceMessage(service, property) {
  const title = property?.title || property?.property_id || "—";
  const ref = property?.property_id || "—";

  const lines = [
    "Hello Market Mizan,",
    "",
    "I am interested in holistic services:",
    `• ${service.label} — ${service.desc}`,
    "",
    `Property: ${title}`,
    `Reference: ${ref}`,
    "",
    "Rental or purchase — please connect me with the right expert."
  ];

  return lines.join("\n");
}
