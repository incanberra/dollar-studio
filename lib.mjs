export function parseAmount(raw) {
  const value = String(raw).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$/.test(value)) return null;
  const amount = Number(value.replaceAll(',', ''));
  return Number.isFinite(amount) && amount >= 0 && amount <= 1e12 ? amount : null;
}

export function convert(amount, fromIndex, toIndex) {
  if (![amount, fromIndex, toIndex].every(Number.isFinite) || amount < 0 || fromIndex <= 0 || toIndex <= 0) throw new RangeError('Invalid amount or price index.');
  return amount * toIndex / fromIndex;
}

export const money = (value, currency = 'AUD') => new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
export const number = (value, digits = 2) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
