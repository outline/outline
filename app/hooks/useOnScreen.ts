import * as React from "react";

/**
 * Hook to return if a given ref is visible on screen.
 *
 * @returns boolean if the node is visible
 */
export default function useOnScreen(ref: React.RefObject<HTMLElement>) {
  const [isIntersecting, setIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      // Update our state when observer callback fires
      setIntersecting(entry.isIntersecting);
    });
    if (element) {
      observer.observe(element);
    }
    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return isIntersecting;
}
