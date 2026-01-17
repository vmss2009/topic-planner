const NON_DIGIT = /\D+/g;

/**
 * Remove every non-digit character and return the bare digits.
 */
export function normalizePhone(raw: string): string {
  return raw?.trim() ? raw.replace(NON_DIGIT, "") : "";
}

/**
 * A phone is considered valid when it has 10 to 15 digits after normalization.
 */
export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Formats digits for display by splitting them into groups of 5.
 */
export function formatPhone(raw: string): string {
  const digits = normalizePhone(raw);
  if (!digits) return "";

  return digits.replace(/(\d{5})(?=\d)/g, "$1 ").trim();
}
