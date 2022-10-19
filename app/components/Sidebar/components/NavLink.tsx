// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js
// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import { Location, createLocation, LocationDescriptor } from "history";
import * as React from "react";
import {
  __RouterContext as RouterContext,
  matchPath,
  match,
} from "react-router";
import { Link } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import history from "~/utils/history";

const resolveToLocation = (
  to: LocationDescriptor | ((location: Location) => LocationDescriptor),
  currentLocation: Location
) => (typeof to === "function" ? to(currentLocation) : to);

const normalizeToLocation = (
  to: LocationDescriptor,
  currentLocation: Location
) => {
  return typeof to === "string"
    ? createLocation(to, null, undefined, currentLocation)
    : to;
};

const joinClassnames = (...classnames: (string | undefined)[]) => {
  return classnames.filter((i) => i).join(" ");
};

export type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  scrollIntoViewIfNeeded?: boolean;
  exact?: boolean;
  isActive?: (match: match | null, location: Location) => boolean;
  location?: Location;
  strict?: boolean;
  to: LocationDescriptor;
  onBeforeClick?: () => void;
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
  onClick,
  onBeforeClick,
  to,
  ...rest
}: Props) => {
  const linkRef = React.useRef(null);
  const context = React.useContext(RouterContext);
  const [preActive, setPreActive] = React.useState<boolean | undefined>(
    undefined
  );
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

  const isActive =
    preActive ??
    !!(isActiveProp ? isActiveProp(match, currentLocation) : match);
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

  const shouldHandleEvent = (
    event: React.MouseEvent<HTMLAnchorElement>
  ): boolean => {
    return (
      !event.defaultPrevented && // onClick prevented default
      event.button === 0 && // ignore everything but left clicks
      !rest.target && // let browser handle "target=_blank" etc.
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey
    );
  };

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (shouldHandleEvent(event)) {
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.focus();

      setPreActive(true);

      // Wait one frame until following link
      setTimeout(() => {
        requestAnimationFrame(executeLink);
        event.currentTarget?.blur();
      }, 10);
    }
  };

  const executeLink = () => {
    history.push(to);
  };

  React.useEffect(() => {
    setPreActive(undefined);
  }, [currentLocation]);

  return (
    <Link
      ref={linkRef}
      onMouseDown={handleClick}
      onClick={(event) => {
        if (shouldHandleEvent(event)) {
          event.stopPropagation();
          event.preventDefault();
        }
      }}
      aria-current={(isActive && ariaCurrent) || undefined}
      className={className}
      style={style}
      to={toLocation}
      {...rest}
    />
  );
};

export default NavLink;
