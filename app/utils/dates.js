// @flow
import {
  isToday,
  isYesterday,
  differenceInCalendarWeeks,
  differenceInCalendarMonths,
} from "date-fns";
import * as React from "react";
import { type TFunction } from "react-i18next";
import LocaleTime from "components/LocaleTime";

export function dateToHeading(dateTime: string, t: TFunction) {
  const date = Date.parse(dateTime);
  const now = new Date();

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
    return <LocaleTime dateTime={dateTime} tooltip={false} format="iiii" />;
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

  if (monthDiff <= 12) {
    return t("This year");
  }

  // If older than the current calendar year then just print the year e.g 2020
  return <LocaleTime dateTime={dateTime} tooltip={false} format="y" />;
}
