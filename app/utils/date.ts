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
import startCase from "lodash/startCase";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
  unicodeCLDRtoBCP47,
  dateLocale,
} from "@shared/utils/date";
import User from "~/models/User";

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

export function dateToExpiry(
  dateTime: string,
  t: TFunction,
  userLocale: string | null | undefined
) {
  const date = Date.parse(dateTime);
  const now = new Date();
  const locale = dateLocale(userLocale);

  if (isYesterday(date)) {
    return t("Expired Yesterday");
  }

  if (isPast(date)) {
    return `${t("Expired on")} ${formatDate(date, "MMM dd, yyyy", { locale })}`;
  }

  if (isToday(date)) {
    return t("Expires Today");
  }

  if (isTomorrow(date)) {
    return t("Expires Tomorrow");
  }

  const prefix = t("Expires on");

  if (isSameWeek(date, now)) {
    return `${prefix} ${formatDate(Date.parse(dateTime), "iiii", {
      locale,
    })}`;
  }

  return `${prefix} ${formatDate(date, "MMM dd, yyyy", { locale })}`;
}

/**
 * Replaces template variables in the given text with the current date and time.
 *
 * @param text The text to replace the variables in
 * @param user The user to get the language/locale from
 * @returns The text with the variables replaced
 */
export function replaceTitleVariables(text: string, user?: User) {
  const locales = user?.language
    ? unicodeCLDRtoBCP47(user.language)
    : undefined;

  return text
    .replace("{date}", startCase(getCurrentDateAsString(locales)))
    .replace("{time}", startCase(getCurrentTimeAsString(locales)))
    .replace("{datetime}", startCase(getCurrentDateTimeAsString(locales)));
}
