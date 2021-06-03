// @flow
import { format, formatDistanceToNow } from "date-fns";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";

const getLocale = (locale: string) =>
  require(`date-fns/locale/${locale}/index.js`);

const locales = {
  en_US: "en-US",
  de_DE: "de",
  es_ES: "es",
  fr_FR: "fr",
  it_IT: "it",
  ko_KR: "ko",
  pt_BR: "pt-BR",
  pt_PT: "pt",
  zh_CN: "zh-CN",
  ru_RU: "ru",
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

function customFormatDistanceToNow(date: number, options = {}) {
  return formatDistanceToNow(date, {
    ...options,
  });
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

  let content = customFormatDistanceToNow(Date.parse(dateTime), {
    addSuffix,
    locale: userLocale ? getLocale(locales[userLocale]) : undefined,
  });

  console.log(content);

  if (shorten) {
    content = content
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return (
    <Tooltip
      tooltip={format(Date.parse(dateTime), "MMMM do, yyyy h:mm a")}
      delay={tooltipDelay}
      placement="bottom"
    >
      <time dateTime={dateTime}>{children || content}</time>
    </Tooltip>
  );
}

export default LocaleTime;
