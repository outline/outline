// @flow
import sub from "date-fns/sub";

export function subtractDate(
  date: Date,
  period: "day" | "week" | "month" | "year"
) {
  switch (period) {
    case "day":
      return sub(date, { days: 1 });
    case "week":
      return sub(date, { weeks: 1 });
    case "month":
      return sub(date, { months: 1 });
    case "year":
      return sub(date, { years: 1 });
    default:
      return date;
  }
}
