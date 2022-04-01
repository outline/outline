import { subDays, subMonths, subWeeks, subYears } from "date-fns";
import { DateFilter } from "@shared/types";

export function subtractDate(date: Date, period: DateFilter) {
  switch (period) {
    case "day":
      return subDays(date, 1);

    case "week":
      return subWeeks(date, 1);

    case "month":
      return subMonths(date, 1);

    case "year":
      return subYears(date, 1);

    default:
      return date;
  }
}

/**
 * Returns the current date as a string formatted depending on current locale.
 *
 * @returns The current date
 */
export function getCurrentDateAsString() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns the current time as a string formatted depending on current locale.
 *
 * @returns The current time
 */
export function getCurrentTimeAsString() {
  return new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "numeric",
  });
}

/**
 * Returns the current date and time as a string formatted depending on current
 * locale.
 *
 * @returns The current date and time
 */
export function getCurrentDateTimeAsString() {
  return new Date().toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
