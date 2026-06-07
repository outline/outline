import * as chrono from "chrono-node";

/**
 * Parse a natural language string such as "tomorrow", "next friday",
 * "jan 2" or "in 3 days" into a calendar date.
 *
 * The time component is intentionally discarded as date mentions are
 * day-granular; only the year, month and day of the matched date are
 * returned.
 *
 * @param input the natural language string to parse.
 * @param referenceDate the date relative to which terms like "tomorrow"
 * are resolved, defaults to now.
 * @returns the matched date with the time set to local midnight, or null
 * when no date could be confidently parsed.
 */
export function parseNaturalLanguageDate(
  input: string,
  referenceDate: Date = new Date()
): Date | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const results = chrono.parse(trimmed, referenceDate, { forwardDate: true });
  const result = results[0];
  if (!result) {
    return null;
  }

  // Only accept matches that span (roughly) the whole input so that
  // unrelated text typed after "@" does not accidentally resolve to a date.
  if (result.text.trim().length < trimmed.length) {
    return null;
  }

  const date = result.start.date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
