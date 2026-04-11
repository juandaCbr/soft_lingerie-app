export function getCardBrand(number: string): "VISA" | "MASTERCARD" | "AMEX" | null {
  const cleanNumber = number.replace(/\s/g, "");
  if (cleanNumber.startsWith("4")) return "VISA";
  if (/^5[1-5]/.test(cleanNumber)) return "MASTERCARD";
  if (/^3[47]/.test(cleanNumber)) return "AMEX";
  return null;
}

export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || "";
  const parts: string[] = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  if (parts.length) return parts.join(" ");
  return v;
}

export function formatExpiry(value: string): string {
  let v = value.replace(/\D/g, "");
  if (v.length > 2) {
    return v.substring(0, 2) + " / " + v.substring(2, 4);
  }
  return v;
}
