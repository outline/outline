// @flow
import subDays from "date-fns/sub_days";
import subMonth from "date-fns/sub_months";
import subWeek from "date-fns/sub_weeks";
import subYear from "date-fns/sub_years";

export function subtractDate(
  date: Date,
  period: "day" | "week" | "month" | "year"
) {
  switch (period) {
    case "day":
      return subDays(date, 1);
    case "week":
      return subWeek(date, 1);
    case "month":
      return subMonth(date, 1);
    case "year":
      return subYear(date, 1);
    default:
      return date;
  }
}
