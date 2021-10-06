// @flow
import * as React from "react";

export default function usePageVisibility(): boolean {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const handleVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  console.log("usePageVisibility", visible);
  return visible;
}
