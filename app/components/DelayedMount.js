// @flow
import * as React from "react";

type Props = {
  delay?: number,
  children: React.Node,
};

export default function DelayedMount({ delay = 150, children }: Props) {
  const [isShowing, setShowing] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => setShowing(true), delay);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!isShowing) {
    return null;
  }

  return children;
}
