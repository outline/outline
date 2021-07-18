// @flow
import {
  isThisWeek,
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

  if (monthDiff <= 24) {
    return t("Last year");
  }

  return <LocaleTime dateTime={dateTime} tooltip={false} />;
}
