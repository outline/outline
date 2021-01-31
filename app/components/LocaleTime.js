// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import format from "date-fns/format";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";

const locales = {
  en: require(`date-fns/locale/en`),
  de: require(`date-fns/locale/de`),
  es: require(`date-fns/locale/es`),
  fr: require(`date-fns/locale/fr`),
  it: require(`date-fns/locale/it`),
  ko: require(`date-fns/locale/ko`),
  pt: require(`date-fns/locale/pt`),
  zh: require(`date-fns/locale/zh_cn`),
};

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
};

function LocaleTime({
  addSuffix,
  children,
  dateTime,
  shorten,
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

  let content = distanceInWordsToNow(dateTime, {
    addSuffix,
    locale: userLocale ? locales[userLocale] : undefined,
  });

  if (shorten) {
    content = content
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return (
    <Tooltip
      tooltip={format(dateTime, "MMMM Do, YYYY h:mm a")}
      delay={tooltipDelay}
      placement="bottom"
    >
      <time dateTime={dateTime}>{children || content}</time>
    </Tooltip>
  );
}

export default LocaleTime;
