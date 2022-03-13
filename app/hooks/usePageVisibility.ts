import * as React from "react";

/**
 * Hook to return page visibility state.
 *
 * @returns boolean if the page is visible
 */
export default function usePageVisibility(): boolean {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const handleVisibilityChange = () => setVisible(!document.hidden);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  return visible;
}
