// @flow
import { isThisWeek, isToday, isYesterday, subWeeks } from "date-fns";
import * as React from "react";
import { type TFunction } from "react-i18next";
import LocaleTime from "components/LocaleTime";

export function dateToHeading(dateTime: string, t: TFunction) {
  const date = Date.parse(dateTime);

  if (isToday(date)) {
    return t("Today");
  }

  if (isYesterday(date)) {
    return t("Yesterday");
  }

  if (isThisWeek(date)) {
    return <LocaleTime dateTime={dateTime} tooltip={false} format="iiii" />;
  }

  const lastWeek = subWeeks(date, 2);
  if (date > lastWeek) {
    return t("Last week");
  }

  return <LocaleTime dateTime={dateTime} tooltip={false} />;
}
