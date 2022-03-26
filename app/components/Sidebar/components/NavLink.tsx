// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js
// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import { Location, createLocation } from "history";
import * as React from "react";
import {
  __RouterContext as RouterContext,
  matchPath,
  match,
} from "react-router";
import { Link } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";

const resolveToLocation = (
  to: string | Record<string, any>,
  currentLocation: Location
) => (typeof to === "function" ? to(currentLocation) : to);

const normalizeToLocation = (
  to: string | Record<string, any>,
  currentLocation: Location
) => {
  return typeof to === "string"
    ? createLocation(to, null, undefined, currentLocation)
    : to;
};

const joinClassnames = (...classnames: (string | undefined)[]) => {
  return classnames.filter((i) => i).join(" ");
};

export type Props = React.HTMLAttributes<HTMLAnchorElement> & {
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  className?: string;
  scrollIntoViewIfNeeded?: boolean;
  exact?: boolean;
  isActive?: (match: match | null, location: Location) => boolean;
  location?: Location;
  strict?: boolean;
  style?: React.CSSProperties;
  to: string | Record<string, any>;
};

/**
 * A <Link> wrapper that knows if it's "active" or not.
 */
const NavLink = ({
  "aria-current": ariaCurrent = "page",
  activeClassName = "active",
  activeStyle,
  className: classNameProp,
  exact,
  isActive: isActiveProp,
  location: locationProp,
  strict,
  style: styleProp,
  scrollIntoViewIfNeeded,
  to,
  ...rest
}: Props) => {
  const linkRef = React.useRef(null);
  const context = React.useContext(RouterContext);
  const currentLocation = locationProp || context.location;
  const toLocation = normalizeToLocation(
    resolveToLocation(to, currentLocation),
    currentLocation
  );
  const { pathname: path } = toLocation;

  // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
  const escapedPath = path?.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
  const match = escapedPath
    ? matchPath(currentLocation.pathname, {
        path: escapedPath,
        exact,
        strict,
      })
    : null;

  const isActive = !!(isActiveProp
    ? isActiveProp(match, currentLocation)
    : match);
  const className = isActive
    ? joinClassnames(classNameProp, activeClassName)
    : classNameProp;
  const style = isActive ? { ...styleProp, ...activeStyle } : styleProp;

  React.useEffect(() => {
    if (isActive && linkRef.current && scrollIntoViewIfNeeded !== false) {
      scrollIntoView(linkRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
      });
    }
  }, [linkRef, scrollIntoViewIfNeeded, isActive]);

  const props = {
    "aria-current": (isActive && ariaCurrent) || undefined,
    className,
    style,
    to: toLocation,
    ...rest,
  };

  return <Link ref={linkRef} {...props} />;
};

export default NavLink;
