// @flow
import * as React from "react";

type Props = {
  delay?: number,
  children: React.Node,
};

export default function DelayedMount({ delay = 250, children }: Props) {
  const [isShowing, setShowing] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => setShowing(true), delay);
    return () => {
      clearTimeout(timeout);
    };
  }, [delay]);

  if (!isShowing) {
    return null;
  }

  return children;
}
