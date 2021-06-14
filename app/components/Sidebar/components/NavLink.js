// @flow
// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js

// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import { createLocation } from "history";
import * as React from "react";
import {
  __RouterContext as RouterContext,
  matchPath,
  type Location,
} from "react-router";
import { Link } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";

const resolveToLocation = (to, currentLocation) =>
  typeof to === "function" ? to(currentLocation) : to;

const normalizeToLocation = (to, currentLocation) => {
  return typeof to === "string"
    ? createLocation(to, null, null, currentLocation)
    : to;
};

const joinClassnames = (...classnames) => {
  return classnames.filter((i) => i).join(" ");
};

type Props = {|
  activeClassName?: String,
  activeStyle?: Object,
  className?: string,
  exact?: boolean,
  isActive?: any,
  location?: Location,
  strict?: boolean,
  style?: Object,
  to: string,
|};

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
  to,
  ...rest
}: Props) => {
  const linkRef = React.useRef();
  const context = React.useContext(RouterContext);
  const currentLocation = locationProp || context.location;
  const toLocation = normalizeToLocation(
    resolveToLocation(to, currentLocation),
    currentLocation
  );
  const { pathname: path } = toLocation;
  // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
  const escapedPath = path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

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
    if (isActive && linkRef.current) {
      scrollIntoView(linkRef.current, {
        scrollMode: "if-needed",
        behavior: "instant",
      });
    }
  }, [linkRef, isActive]);

  const props = {
    "aria-current": (isActive && ariaCurrent) || null,
    className,
    style,
    to: toLocation,
    ...rest,
  };

  return <Link ref={linkRef} {...props} />;
};

export default NavLink;
