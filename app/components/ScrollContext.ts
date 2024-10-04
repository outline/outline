import * as React from "react";

/**
 * Context to provide a reference to the scrollable container
 */
const ScrollContext = React.createContext<
  React.RefObject<HTMLDivElement> | undefined
>(undefined);

/**
 * Hook to get the scrollable container reference
 */
export const useScrollContext = () => React.useContext(ScrollContext);

export default ScrollContext;
