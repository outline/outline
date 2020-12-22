// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import format from "date-fns/format";
import * as React from "react";
import Tooltip from "components/Tooltip";
import useStores from "hooks/useStores";

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

function Time(props: Props) {
  const { auth } = useStores();
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

  const { shorten, addSuffix } = props;
  let content = distanceInWordsToNow(props.dateTime, {
    addSuffix,
    locale: auth.user ? auth.user.language : undefined,
  });

  if (shorten) {
    content = content
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return (
    <Tooltip
      tooltip={format(props.dateTime, "MMMM Do, YYYY h:mm a")}
      delay={props.tooltipDelay}
      placement="bottom"
    >
      <time dateTime={props.dateTime}>{props.children || content}</time>
    </Tooltip>
  );
}

export default Time;
