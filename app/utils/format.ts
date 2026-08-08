/** Badge classes per record status, shared by the pet store pages. */
const BADGE_TONES: Record<string, string> = {
  checked_in: "bg-green-50 text-green-700 ring-green-600/20",
  booked: "bg-blue-50 text-blue-700 ring-blue-700/10",
  checked_out: "bg-gray-50 text-gray-600 ring-gray-500/10",
  cancelled: "bg-red-50 text-red-700 ring-red-600/10",
  paid: "bg-green-50 text-green-700 ring-green-600/20",
  draft: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  refunded: "bg-gray-50 text-gray-600 ring-gray-500/10",
  active: "bg-green-50 text-green-700 ring-green-600/20",
  archived: "bg-gray-50 text-gray-600 ring-gray-500/10",
};

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

/**
 * Returns the badge classes for a record status.
 *
 * @param status the record status.
 * @returns the class name for a status badge.
 */
export function statusBadge(status: string): string {
  const tone =
    BADGE_TONES[status] ?? "bg-gray-50 text-gray-600 ring-gray-500/10";
  return `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${tone}`;
}
