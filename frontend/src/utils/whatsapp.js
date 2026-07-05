import { getContactPhoneDigits } from "./contactInfo";

export function getWhatsAppDigits() {
  return getContactPhoneDigits();
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

export function buildPropertyReferenceTitle(property) {
  const ref = property?.property_id || "—";
  const title = property?.title || "—";
  return `${ref} · ${title}`;
}

export function buildContactFormWhatsAppMessage({
  firstName,
  lastName,
  email,
  phone,
  subject,
  propertyReference,
  questions,
  serviceLabel
}) {
  const name = `${firstName} ${lastName}`.trim();
  const questionBlock = questions?.trim() || "";

  const lines = [
    "Hello Mizan Team,",
    "",
    `Subject: ${subject?.trim() || "Property inquiry"}`
  ];

  if (propertyReference) lines.push(`Reference / Title: ${propertyReference}`);
  if (serviceLabel) lines.push(`Service: ${serviceLabel}`);

  lines.push(
    "",
    "I am interested in the property",
    "and would like further assistance. Here are my questions:",
    "",
    questionBlock,
    "",
    "Please contact me asap.",
    "",
    "Best,",
    name,
    "",
    `Email: ${email}`,
    `Phone: ${phone}`
  );

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
