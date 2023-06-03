import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import lazyWithRetry from "~/utils/lazyWithRetry";

const LocaleTime = lazyWithRetry(() => import("~/components/LocaleTime"));

type Props = React.ComponentProps<typeof LocaleTime> & {
  onClick?: () => void;
};

function Time({ onClick, ...props }: Props) {
  let content = formatDistanceToNow(Date.parse(props.dateTime), {
    addSuffix: props.addSuffix,
  });

  if (props.shorten) {
    content = content
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return (
    <span onClick={onClick}>
      <React.Suspense
        fallback={
          <time dateTime={props.dateTime}>{props.children || content}</time>
        }
      >
        <LocaleTime tooltipDelay={250} {...props} />
      </React.Suspense>
    </span>
  );
}

export default Time;
