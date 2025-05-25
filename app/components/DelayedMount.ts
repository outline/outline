import { useState, useEffect } from "react";

type Props = {
  delay?: number;
  children: JSX.Element;
};

export default function DelayedMount({ delay = 250, children }: Props) {
  const [isShowing, setShowing] = useState(false);

  useEffect(() => {
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
