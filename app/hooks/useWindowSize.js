// @flow
import { debounce } from "lodash";
import * as React from "react";

export default function useWindowSize() {
  const [windowSize, setWindowSize] = React.useState({
    width: parseInt(window.innerWidth),
    height: parseInt(window.innerHeight),
  });

  React.useEffect(() => {
    // Handler to call on window resize
    const handleResize = debounce(() => {
      // Set window width/height to state
      setWindowSize({
        width: parseInt(window.innerWidth),
        height: parseInt(window.innerHeight),
      });
    }, 100);

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}
