// @flow
import { subDays, subMonths, subWeeks, subYears } from "date-fns";

export function subtractDate(
  date: Date,
  period: "day" | "week" | "month" | "year"
) {
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
