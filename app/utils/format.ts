/** Badge classes per record status, shared by the pet store pages. */
/**
 * Formats an amount as Indonesian rupiah, matching the reference app.
 *
 * @param amount the amount in rupiah.
 * @returns the formatted amount.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
/**
 * Formats a date for the compact table and list rows.
 *
 * @param value an ISO date string.
 * @returns the formatted date.
 */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
