import * as React from "react";

/**
 * React hook to grab active element
 */
export default function useActiveElement() {
  const [active, setActive] = React.useState(window.document.activeElement);

  const handleFocusIn = React.useCallback(() => {
    setActive(document.activeElement);
  }, [setActive]);

  React.useEffect(() => {
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  });

  return active;
}
