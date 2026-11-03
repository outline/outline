// based on: https://reacttraining.com/react-router/web/guides/scroll-restoration
import { useEffect } from "react";
import { useLocationSelector } from "~/hooks/useLocationSelector";
import usePrevious from "~/hooks/usePrevious";
import { useScrollContext } from "./ScrollContext";

type Props = {
  children: React.JSX.Element;
};

export default function ScrollToTop({ children }: Props) {
  const pathname = useLocationSelector((location) => location.pathname);
  const hash = useLocationSelector((location) => location.hash);
  const retainScrollPosition = useLocationSelector<
    { retainScrollPosition?: boolean } | undefined,
    boolean | undefined
  >((location) => location.state?.retainScrollPosition);
  const previousLocationPathname = usePrevious(pathname);
  const scrollContainerRef = useScrollContext();

  useEffect(() => {
    if (pathname === previousLocationPathname || retainScrollPosition) {
      return;
    }
    // The destination has an anchor, scrolling is handled by the target itself
    if (hash) {
      return;
    }
    // exception for when entering or exiting document edit, scroll position should not reset
    if (
      pathname.match(/\/edit\/?$/) ||
      previousLocationPathname?.match(/\/edit\/?$/)
    ) {
      return;
    }
    (scrollContainerRef?.current || window).scrollTo(0, 0);
  }, [
    scrollContainerRef,
    pathname,
    hash,
    previousLocationPathname,
    retainScrollPosition,
  ]);

  return children;
}
