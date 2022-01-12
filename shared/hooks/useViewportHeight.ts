import { useLayoutEffect, useState } from "react";

export default function useViewportHeight(): number | void {
  // https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport#browser_compatibility
  // Note: No support in Firefox at time of writing, however this mainly exists
  // for virtual keyboards on mobile devices, so that's okay.
  const [height, setHeight] = useState<number>(
    () => window.visualViewport?.height || window.innerHeight
  );

  useLayoutEffect(() => {
    const handleResize = () => {
      setHeight(() => window.visualViewport?.height || window.innerHeight);
    };

    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return height;
}
