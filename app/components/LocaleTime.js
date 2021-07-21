// @flow
import { format as formatDate, formatDistanceToNow } from "date-fns";
import {
  enUS,
  de,
  faIR,
  fr,
  es,
  it,
  ja,
  ko,
  ptBR,
  pt,
  zhCN,
  zhTW,
  ru,
} from "date-fns/locale";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useUserLocale from "hooks/useUserLocale";

const locales = {
  en_US: enUS,
  de_DE: de,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  it_IT: it,
  ja_JP: ja,
  ko_KR: ko,
  pt_BR: ptBR,
  pt_PT: pt,
  zh_CN: zhCN,
  zh_TW: zhTW,
  ru_RU: ru,
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
  relative?: boolean,
  format?: string,
  tooltip?: boolean,
};

function LocaleTime({
  addSuffix,
  children,
  dateTime,
  shorten,
  format,
  relative,
  tooltipDelay,
  tooltip,
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

  const locale = userLocale ? locales[userLocale] : undefined;
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

  const content = children || relative ? relativeContent : tooltipContent;

  if (!tooltip) {
    return content;
  }

  return (
    <Tooltip tooltip={tooltipContent} delay={tooltipDelay} placement="bottom">
      <time dateTime={dateTime}>{content}</time>
    </Tooltip>
  );
}

export default LocaleTime;
