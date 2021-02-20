// @flow
import * as React from "react";
import useStickyState from "../hooks/useStickyState";

type Props = {|
  children: React.Node,
|};

export default function Session({ children }: Props) {
  const ref = React.useRef(false);
  const [, setPreviousSession] = useStickyState<string>("", "previous-session");
  const [currentSession, setCurrentSession] = useStickyState<string>(
    "",
    "current-session"
  );

  React.useEffect(() => {
    if (!ref.current) {
      if (currentSession) {
        setPreviousSession(currentSession);
      }
      setCurrentSession(new Date().toISOString());
      ref.current = true;
    }
  }, [setCurrentSession, setPreviousSession, currentSession]);

  return children;
}
