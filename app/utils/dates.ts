import {
  isToday,
  isYesterday,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format as formatDate,
} from "date-fns";
import { TFunction } from "react-i18next";
import { dateLocale } from "~/utils/i18n";

export function dateToHeading(
  dateTime: string,
  t: TFunction,
  userLocale: string | null | undefined
) {
  const date = Date.parse(dateTime);
  const now = new Date();
  const locale = dateLocale(userLocale);

  if (isToday(date)) {
    return t("Today");
  }

  if (isYesterday(date)) {
    return t("Yesterday");
  }

  // If the current calendar week but not today or yesterday then return the day
  // of the week as a string. We use the LocaleTime component here to gain
  // async bundle loading of languages
  const weekDiff = differenceInCalendarWeeks(now, date);

  if (weekDiff === 0) {
    return formatDate(Date.parse(dateTime), "iiii", {
      locale,
    });
  }

  if (weekDiff === 1) {
    return t("Last week");
  }

  const monthDiff = differenceInCalendarMonths(now, date);

  if (monthDiff === 0) {
    return t("This month");
  }

  if (monthDiff === 1) {
    return t("Last month");
  }

  const yearDiff = differenceInCalendarYears(now, date);

  if (yearDiff === 0) {
    return t("This year");
  }

  // If older than the current calendar year then just print the year e.g 2020
  return formatDate(Date.parse(dateTime), "y", {
    locale,
  });
}
