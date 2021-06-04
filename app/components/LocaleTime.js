// @flow
import { format, formatDistanceToNow } from "date-fns/esm";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";

const locales = {
  en_US: require(`date-fns/locale/en-US`),
  de_DE: require(`date-fns/locale/de`),
  es_ES: require(`date-fns/locale/es`),
  fr_FR: require(`date-fns/locale/fr`),
  it_IT: require(`date-fns/locale/it`),
  ko_KR: require(`date-fns/locale/ko`),
  pt_BR: require(`date-fns/locale/pt-BR`),
  pt_PT: require(`date-fns/locale/pt`),
  zh_CN: require(`date-fns/locale/zh-CN`),
  ru_RU: require(`date-fns/locale/ru`),
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

  let content = formatDistanceToNow(Date.parse(dateTime), {
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
      tooltip={format(Date.parse(dateTime), "MMMM do, yyyy h:mm a")}
      delay={tooltipDelay}
      placement="bottom"
    >
      <time dateTime={dateTime}>{children || content}</time>
    </Tooltip>
  );
}

export default LocaleTime;
