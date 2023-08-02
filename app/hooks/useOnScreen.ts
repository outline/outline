import * as React from "react";

const isSupported = "IntersectionObserver" in window;

/**
 * Hook to return if a given ref is visible on screen.
 *
 * @returns boolean if the node is visible
 */
export default function useOnScreen(ref: React.RefObject<HTMLElement>) {
  const [isIntersecting, setIntersecting] = React.useState(!isSupported);

  React.useEffect(() => {
    const element = ref.current;
    let observer: IntersectionObserver | undefined;

    if (isSupported) {
      observer = new IntersectionObserver(([entry]) => {
        // Update our state when observer callback fires
        setIntersecting(entry.isIntersecting);
      });
    }

    if (element) {
      observer?.observe(element);
    }
    return () => {
      if (element) {
        observer?.unobserve(element);
      }
    };
  }, [ref]);

  return isIntersecting;
}
