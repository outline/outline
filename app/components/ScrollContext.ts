import { createContext, useContext } from "react";

/**
 * Context to provide a reference to the scrollable container
 */
const ScrollContext = createContext<
  React.RefObject<HTMLDivElement> | undefined
>(undefined);

/**
 * Hook to get the scrollable container reference
 */
export const useScrollContext = () => useContext(ScrollContext);

export default ScrollContext;
