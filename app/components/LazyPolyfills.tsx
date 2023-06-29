import * as React from "react";
import Logger from "~/utils/Logger";
import { loadPolyfills } from "~/utils/polyfills";

/**
 * Asyncronously load required polyfills. Should wrap the React tree.
 */
export const LazyPolyfill: React.FC = ({ children }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    loadPolyfills()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        Logger.error("Polyfills failed to load", error);
      });
  }, []);

  if (!isLoaded) {
    return null;
  }

  return <>{children}</>;
};

export default LazyPolyfill;
