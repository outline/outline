import * as React from "react";

const isSupported = "IntersectionObserver" in window;

/**
 * Hook to return if a given ref is visible on screen.
 *
 * @returns boolean if the node is visible
 */
export default function useOnScreen(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIntersecting] = React.useState(!isSupported);
  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const threshold = Array.isArray(options?.threshold)
    ? options?.threshold.join(",")
    : options?.threshold;

  React.useEffect(() => {
    const element = ref.current;
    let observer: IntersectionObserver | undefined;

    if (isSupported) {
      observer = new IntersectionObserver(([entry]) => {
        setIntersecting(entry.isIntersecting);
      }, options);
    }

    if (element) {
      observer?.observe(element);
    }
    return () => {
      if (element) {
        observer?.unobserve(element);
      }
    };
    // Re-create when option primitives change; options object identity ignored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, root, rootMargin, threshold]);

  return isIntersecting;
}
