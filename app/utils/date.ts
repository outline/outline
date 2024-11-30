import {
  isToday,
  isYesterday,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format as formatDate,
  isTomorrow,
  isSameWeek,
  isPast,
} from "date-fns";
import { TFunction } from "i18next";
import { dateLocale, locales } from "@shared/utils/date";

export function dateToHeading(
  dateTime: string,
  t: TFunction,
  userLocale: keyof typeof locales | undefined
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

/**
 * Converts a date string to a human-readable expiry string.
 *
 * @param dateTime The date string to convert
 * @param t The translation function
 * @param userLocale The user's locale
 */
export function dateToExpiry(
  dateTime: string,
  t: TFunction,
  userLocale: keyof typeof locales | null | undefined
) {
  const date = Date.parse(dateTime);
  const now = new Date();
  const locale = dateLocale(userLocale);

  if (isYesterday(date)) {
    return t("Expired yesterday");
  }

  if (isPast(date)) {
    return `${t("Expired {{ date }}", {
      date: formatDate(date, "MMM dd, yyyy", { locale }),
    })}`;
  }

  if (isToday(date)) {
    return t("Expires today");
  }

  if (isTomorrow(date)) {
    return t("Expires tomorrow");
  }

  if (isSameWeek(date, now)) {
    return t("Expires {{ date }}", {
      date: formatDate(Date.parse(dateTime), "iiii", {
        locale,
      }),
    });
  }

  return t("Expires {{ date }}", {
    date: formatDate(date, "MMM dd, yyyy", { locale }),
  });
}
