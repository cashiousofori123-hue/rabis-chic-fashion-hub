export function normalizeInternationalPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

export function whatsappLink(value, message = '') {
  const number = normalizeInternationalPhone(value);
  return number.length >= 8 && number.length <= 15
    ? `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    : '';
}

export function telLink(value) {
  const number = normalizeInternationalPhone(value);
  return number.length >= 8 && number.length <= 15 ? `tel:+${number}` : '';
}
