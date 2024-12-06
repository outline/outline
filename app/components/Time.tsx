import * as React from "react";
import { dateToRelative } from "@shared/utils/date";
import type { Props as LocaleTimeProps } from "~/components/LocaleTime";
import lazyWithRetry from "~/utils/lazyWithRetry";

const LocaleTime = lazyWithRetry(() => import("~/components/LocaleTime"));

type Props = LocaleTimeProps & {
  onClick?: () => void;
};

function Time({ onClick, ...props }: Props) {
  const content = dateToRelative(Date.parse(props.dateTime), {
    addSuffix: props.addSuffix,
    shorten: props.shorten,
  });

  return (
    <span onClick={onClick}>
      <React.Suspense
        fallback={
          <time dateTime={props.dateTime}>{props.children || content}</time>
        }
      >
        <LocaleTime {...props} />
      </React.Suspense>
    </span>
  );
}

export default Time;
