// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js
// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import { Location, createLocation } from "history";
import * as React from "react";
import { __RouterContext as RouterContext, matchPath } from "react-router";
import { Link } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'to' implicitly has an 'any' type.
const resolveToLocation = (to, currentLocation) =>
  typeof to === "function" ? to(currentLocation) : to;

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'to' implicitly has an 'any' type.
const normalizeToLocation = (to, currentLocation) => {
  return typeof to === "string"
    ? // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      createLocation(to, null, null, currentLocation)
    : to;
};

// @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'classnames' implicitly has an 'any... Remove this comment to see the full error message
const joinClassnames = (...classnames) => {
  return classnames.filter((i) => i).join(" ");
};

export type Props = {
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  className?: string;
  scrollIntoViewIfNeeded?: boolean;
  exact?: boolean;
  isActive?: any;
  location?: Location;
  strict?: boolean;
  style?: React.CSSProperties;
  to: string;
};

/**
 * A <Link> wrapper that knows if it's "active" or not.
 */
const NavLink = ({
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'aria-current' does not exist on type 'Pr... Remove this comment to see the full error message
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
    if (isActive && linkRef.current && scrollIntoViewIfNeeded !== false) {
      scrollIntoView(linkRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
      });
    }
  }, [linkRef, scrollIntoViewIfNeeded, isActive]);

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
