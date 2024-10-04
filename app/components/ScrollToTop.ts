// based on: https://reacttraining.com/react-router/web/guides/scroll-restoration
import * as React from "react";
import { useLocation } from "react-router-dom";
import usePrevious from "~/hooks/usePrevious";
import { useScrollContext } from "./ScrollContext";

type Props = {
  children: JSX.Element;
};

export default function ScrollToTop({ children }: Props) {
  const location = useLocation<{ retainScrollPosition?: boolean }>();
  const previousLocationPathname = usePrevious(location.pathname);
  const scrollContainerRef = useScrollContext();

  React.useEffect(() => {
    if (
      location.pathname === previousLocationPathname ||
      location.state?.retainScrollPosition
    ) {
      return;
    }
    // exception for when entering or exiting document edit, scroll position should not reset
    if (
      location.pathname.match(/\/edit\/?$/) ||
      previousLocationPathname?.match(/\/edit\/?$/)
    ) {
      return;
    }
    (scrollContainerRef?.current || window).scrollTo(0, 0);
  }, [
    scrollContainerRef,
    location.pathname,
    previousLocationPathname,
    location.state?.retainScrollPosition,
  ]);

  return children;
}
