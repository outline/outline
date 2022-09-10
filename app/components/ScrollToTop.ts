// based on: https://reacttraining.com/react-router/web/guides/scroll-restoration
import * as React from "react";
import { useLocation } from "react-router-dom";
import usePrevious from "~/hooks/usePrevious";

type Props = {
  children: JSX.Element;
};

export default function ScrollToTop({ children }: Props) {
  const location = useLocation<{ retainScrollPosition?: boolean }>();
  const previousLocationPathname = usePrevious(location.pathname);

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
    window.scrollTo(0, 0);
  }, [
    location.pathname,
    previousLocationPathname,
    location.state?.retainScrollPosition,
  ]);

  return children;
}
