const DEFAULT_CONTACT_PHONE = "+251941881133";

export function getContactPhone() {
  return import.meta.env.VITE_WHATSAPP_NUMBER || DEFAULT_CONTACT_PHONE;
}

export function getContactPhoneDigits() {
  return getContactPhone().replace(/\D/g, "");
}

export function getContactPhoneTelHref() {
  return `tel:+${getContactPhoneDigits()}`;
}

export function formatContactPhoneDisplay() {
  const digits = getContactPhoneDigits();
  if (digits.startsWith("251") && digits.length >= 12) {
    return `+251 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return digits ? `+${digits}` : DEFAULT_CONTACT_PHONE;
}
