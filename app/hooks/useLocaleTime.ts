import { format as formatDate } from "date-fns";
import * as React from "react";
import { dateLocale, dateToRelative, locales } from "@shared/utils/date";
import useUserLocale from "~/hooks/useUserLocale";

let callbacks: (() => void)[] = [];

// This is a shared timer that fires every minute, used for
// updating all Time components across the page all at once.
setInterval(() => {
  callbacks.forEach((cb) => cb());
}, 1000 * 60);

function eachMinute(fn: () => void) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter((cb) => cb !== fn);
  };
}

export type Props = {
  dateTime: string;
  addSuffix?: boolean;
  shorten?: boolean;
  relative?: boolean;
  format?: Partial<Record<keyof typeof locales, string>>;
};

export const useLocaleTime = ({
  addSuffix,
  dateTime,
  shorten,
  format,
  relative,
}: Props) => {
  const userLocale = useUserLocale();
  const dateFormatLong: Record<string, string> = {
    en_US: "MMMM do, yyyy h:mm a",
    fr_FR: "'Le 'd MMMM yyyy 'à' H:mm",
  };
  const formatLocaleLong =
    (userLocale ? dateFormatLong[userLocale] : undefined) ??
    "MMMM do, yyyy h:mm a";
  // @ts-expect-error fallback to formatLocaleLong
  const formatLocale = format?.[userLocale] ?? formatLocaleLong;
  const [_, setMinutesMounted] = React.useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const callback = React.useRef<() => void>();

  React.useEffect(() => {
    callback.current = eachMinute(() => {
      setMinutesMounted((state) => ++state);
    });
    return () => {
      if (callback.current) {
        callback.current?.();
      }
    };
  }, []);

  const date = new Date(Date.parse(dateTime));
  const locale = dateLocale(userLocale);
  const relativeContent = dateToRelative(date, {
    addSuffix,
    locale,
    shorten,
  });

  const tooltipContent = formatDate(date, formatLocaleLong, {
    locale,
  });
  const content =
    relative !== false
      ? relativeContent
      : formatDate(date, formatLocale, {
          locale,
        });

  return {
    content,
    tooltipContent,
  };
};
