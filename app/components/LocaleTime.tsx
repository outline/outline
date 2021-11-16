import { format as formatDate, formatDistanceToNow } from "date-fns";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/i18n' or its correspondi... Remove this comment to see the full error message
import { dateLocale } from "utils/i18n";

// @ts-expect-error ts-migrate(7034) FIXME: Variable 'callbacks' implicitly has type 'any[]' i... Remove this comment to see the full error message
let callbacks = [];
// This is a shared timer that fires every minute, used for
// updating all Time components across the page all at once.
setInterval(() => {
  // @ts-expect-error ts-migrate(7005) FIXME: Variable 'callbacks' implicitly has an 'any[]' typ... Remove this comment to see the full error message
  callbacks.forEach((cb) => cb());
}, 1000 * 60);

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'fn' implicitly has an 'any' type.
function eachMinute(fn) {
  callbacks.push(fn);
  return () => {
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'callbacks' implicitly has an 'any[]' typ... Remove this comment to see the full error message
    callbacks = callbacks.filter((cb) => cb !== fn);
  };
}

type Props = {
  dateTime: string;
  children?: React.ReactNode;
  tooltipDelay?: number;
  addSuffix?: boolean;
  shorten?: boolean;
  relative?: boolean;
  format?: string;
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
    // @ts-expect-error ts-migrate(2322) FIXME: Type '() => void' is not assignable to type 'undef... Remove this comment to see the full error message
    callback.current = eachMinute(() => {
      setMinutesMounted((state) => ++state);
    });
    return () => {
      if (callback.current) {
        // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
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
    {
      locale,
    }
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
