// Type-only import is fully erased at compile time, so it does not pull
// chrono-node into the bundle.
import type * as Chrono from "chrono-node";

/**
 * chrono-node is a sizeable dependency, so it is loaded lazily on first use
 * via a dynamic import. The bundler splits it into its own chunk that is only
 * fetched when a date actually needs to be parsed (i.e. when the user types in
 * the mention menu), keeping it out of the main bundle.
 */
let chronoPromise: Promise<typeof Chrono> | undefined;

function loadChrono(): Promise<typeof Chrono> {
  if (!chronoPromise) {
    chronoPromise = import("chrono-node").catch((err) => {
      // Don't cache a rejected import (e.g. a transient chunk-load failure),
      // otherwise every subsequent parse would reuse the failure. Clearing it
      // lets the next call retry.
      chronoPromise = undefined;
      throw err;
    });
  }
  return chronoPromise;
}

export interface ParsedNaturalLanguageDate {
  /** The matched date, at local midnight unless a time was given. */
  date: Date;
  /** Whether the input named a specific time of day. */
  hasTime: boolean;
}

/**
 * Parse a natural language string such as "tomorrow", "next friday",
 * "jan 2", "in 3 days" or "1pm" into a calendar date.
 *
 * The time component is only kept when the input actually named one,
 * otherwise the matched date is normalized to local midnight. chrono-node is
 * loaded asynchronously the first time this is called.
 *
 * @param input the natural language string to parse.
 * @param referenceDate the date relative to which terms like "tomorrow"
 * are resolved, defaults to now.
 * @returns a promise resolving to the matched date and whether it is
 * time-specific, or null when no date could be confidently parsed.
 */
export async function parseNaturalLanguageDate(
  input: string,
  referenceDate: Date = new Date()
): Promise<ParsedNaturalLanguageDate | null> {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const chrono = await loadChrono();
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
  const hasTime = result.start.isCertain("hour");

  return {
    date: hasTime
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          date.getHours(),
          date.getMinutes()
        )
      : new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    hasTime,
  };
}
