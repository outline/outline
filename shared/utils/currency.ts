/**
 * Common currency symbols used around the world.
 */
const currencySymbols = [
  "$", // Dollar (USD, CAD, AUD, etc.)
  "€", // Euro
  "£", // Pound
  "¥", // Yen/Yuan
  "₹", // Indian Rupee
  "₽", // Russian Ruble
  "₿", // Bitcoin
  "₩", // Korean Won
  "₪", // Israeli Shekel
  "₺", // Turkish Lira
  "₴", // Ukrainian Hryvnia
  "₱", // Philippine Peso
  "฿", // Thai Baht
  "₫", // Vietnamese Dong
  "₦", // Nigerian Naira
  "₵", // Ghanaian Cedi
  "₡", // Costa Rican Colón
  "₲", // Paraguayan Guaraní
  "₸", // Kazakhstani Tenge
  "₼", // Azerbaijani Manat
  "₾", // Georgian Lari
  "৳", // Bangladeshi Taka
  "₠", // European Currency Unit
  "R$", // Brazilian Real
  "kr", // Scandinavian Krona/Krone
  "zł", // Polish Zloty
  "Kč", // Czech Koruna
  "Ft", // Hungarian Forint
  "CHF", // Swiss Franc
  "лв", // Bulgarian Lev
  "lei", // Romanian Leu
  "ден", // Macedonian Denar
  "дин", // Serbian Dinar
  "ر.س", // Saudi Riyal
  "د.إ", // UAE Dirham
  "ر.ع", // Omani Rial
  "د.ك", // Kuwaiti Dinar
  "د.ب", // Bahraini Dinar
  "ر.ق", // Qatari Riyal
];

/**
 * Checks if a string appears to be a currency value.
 * Matches formats like: $1,234.56, €50, £1.000,50, -$500, ($500), 1234¥
 *
 * @param value - the string to check.
 * @returns true if the string appears to be a currency value.
 */
export function isCurrency(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();

  // Must contain at least one currency symbol
  const hasCurrencySymbol = currencySymbols.some((symbol) =>
    trimmed.includes(symbol)
  );
  if (!hasCurrencySymbol) {
    return false;
  }

  // Must contain at least one digit
  if (!/\d/.test(trimmed)) {
    return false;
  }

  // Remove all valid currency characters and check if anything unexpected remains
  let remaining = trimmed;

  // Remove currency symbols (longest first to handle multi-char symbols like R$)
  const sortedSymbols = [...currencySymbols].sort(
    (a, b) => b.length - a.length
  );
  for (const symbol of sortedSymbols) {
    remaining = remaining.split(symbol).join("");
  }

  // Remove digits, separators, whitespace, and negative indicators
  remaining = remaining.replace(/[\d.,\s()\-]/g, "");

  // If anything remains, it's not a valid currency
  return remaining.length === 0;
}

/**
 * Parses a currency string and returns its numeric value.
 * Handles various formats including:
 * - US/UK style: $1,234.56
 * - European style: €1.234,56
 * - Negative values: -$500, ($500), -500€
 * - Currency symbol before or after the number
 *
 * @param value - the currency string to parse.
 * @returns the numeric value, or null if parsing fails.
 */
export function parseCurrency(value: string): number | null {
  if (!value || value.trim().length === 0) {
    return null;
  }

  let trimmed = value.trim();

  // Detect negative values: parentheses indicate negative in accounting
  const isNegative =
    trimmed.startsWith("(") ||
    trimmed.startsWith("-") ||
    trimmed.includes(")-") ||
    (trimmed.endsWith(")") && trimmed.includes("("));

  // Remove currency symbols, parentheses, and whitespace
  // Sort symbols by length descending so multi-character symbols (like R$) are removed first
  let cleaned = trimmed;
  const sortedSymbols = [...currencySymbols].sort(
    (a, b) => b.length - a.length
  );
  for (const symbol of sortedSymbols) {
    cleaned = cleaned.split(symbol).join("");
  }
  cleaned = cleaned
    .replace(/[()]/g, "")
    .replace(/\s/g, "")
    .replace(/^-|-$/g, "");

  // Determine the decimal separator by looking at the last separator
  // European format uses comma as decimal: 1.234,56
  // US/UK format uses period as decimal: 1,234.56
  const lastComma = cleaned.lastIndexOf(",");
  const lastPeriod = cleaned.lastIndexOf(".");
  const hasComma = lastComma !== -1;
  const hasPeriod = lastPeriod !== -1;

  if (hasComma && hasPeriod) {
    // Both separators present - the one that appears last is the decimal
    if (lastComma > lastPeriod) {
      // European format: comma is the decimal separator
      // Remove periods (thousands separator) and replace comma with period
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US/UK format: period is the decimal separator
      // Remove commas (thousands separator)
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only commas present - could be thousands separator or decimal
    // If there's exactly one comma and 1-2 digits after it, treat as decimal
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(",", ".");
    } else {
      // Multiple commas or 3+ digits after comma = thousands separator
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasPeriod) {
    // Only periods present - could be thousands separator or decimal
    // If there's exactly one period and 1-2 digits after it, treat as decimal
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Already in correct format
    } else {
      // Multiple periods or 3+ digits after period = thousands separator
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const numericValue = parseFloat(cleaned);

  if (isNaN(numericValue)) {
    return null;
  }

  return isNegative ? -Math.abs(numericValue) : numericValue;
}
