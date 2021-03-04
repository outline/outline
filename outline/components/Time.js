// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import * as React from "react";

const LocaleTime = React.lazy(() => import("components/LocaleTime"));

type Props = {
  dateTime: string,
  children?: React.Node,
  tooltipDelay?: number,
  addSuffix?: boolean,
  shorten?: boolean,
};

function Time(props: Props) {
  let content = distanceInWordsToNow(props.dateTime, {
    addSuffix: props.addSuffix,
  });

  if (props.shorten) {
    content = content
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return (
    <React.Suspense
      fallback={
        <time dateTime={props.dateTime}>{props.children || content}</time>
      }
    >
      <LocaleTime {...props} />
    </React.Suspense>
  );
}

export default Time;
