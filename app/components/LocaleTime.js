// @flow
import { format as formatDate, formatDistanceToNow } from "date-fns";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";
import { dateLocale } from "utils/i18n";

let callbacks = [];

// This is a shared timer that fires every minute, used for
// updating all Time components across the page all at once.
setInterval(() => {
  callbacks.forEach((cb) => cb());
}, 1000 * 60);

function eachMinute(fn) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter((cb) => cb !== fn);
  };
}

type Props = {
  dateTime: string,
  children?: React.Node,
  tooltipDelay?: number,
  addSuffix?: boolean,
  shorten?: boolean,
  relative?: boolean,
  format?: string,
};

function LocaleTime({
  addSuffix,
  children,
  dateTime,
  shorten,
  format,
  relative,
  tooltipDelay,
}: Props) {
  const userLocale = useUserLocale();
  const [_, setMinutesMounted] = React.useState(0); // eslint-disable-line no-unused-vars
  const callback = React.useRef();

  React.useEffect(() => {
    callback.current = eachMinute(() => {
      setMinutesMounted((state) => ++state);
    });

    return () => {
      if (callback.current) {
        callback.current();
      }
    };
  }, []);

  const locale = dateLocale(userLocale);
  let relativeContent = formatDistanceToNow(Date.parse(dateTime), {
    addSuffix,
    locale,
  });

  if (shorten) {
    relativeContent = relativeContent
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  const tooltipContent = formatDate(
    Date.parse(dateTime),
    format || "MMMM do, yyyy h:mm a",
    { locale }
  );

  const content =
    children || relative !== false ? relativeContent : tooltipContent;

  return (
    <Tooltip tooltip={tooltipContent} delay={tooltipDelay} placement="bottom">
      <time dateTime={dateTime}>{content}</time>
    </Tooltip>
  );
}

export default LocaleTime;
