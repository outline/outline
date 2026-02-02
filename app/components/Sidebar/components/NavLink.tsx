// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js
// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import type { Location, LocationDescriptor } from "history";
import { createLocation } from "history";
import * as React from "react";
import type { match } from "react-router";
import { __RouterContext as RouterContext, matchPath } from "react-router";
import { Link } from "react-router-dom";
import scrollIntoView from "scroll-into-view-if-needed";
import history from "~/utils/history";

const resolveToLocation = (
  to: LocationDescriptor | ((location: Location) => LocationDescriptor),
  currentLocation: Location
) => (typeof to === "function" ? to(currentLocation) : to);

const normalizeToLocation = (
  to: LocationDescriptor,
  currentLocation: Location
) =>
  typeof to === "string"
    ? createLocation(to, null, undefined, currentLocation)
    : to;

const joinClassnames = (...classnames: (string | undefined)[]) =>
  classnames.filter((i) => i).join(" ");

/**
 * Props for the NavLink component.
 * Extends standard anchor element attributes with React Router navigation functionality.
 */
export interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** CSS class name to apply when the link is active */
  activeClassName?: string;
  /** Inline styles to apply when the link is active */
  activeStyle?: React.CSSProperties;
  /** Whether to automatically scroll the link into view when it becomes active */
  scrollIntoViewIfNeeded?: boolean;
  /** If true, only matches when the path matches the location.pathname exactly */
  exact?: boolean;
  /** If true, use history.replace instead of history.push when navigating */
  replace?: boolean;
  /** Custom function to determine if the link is active */
  isActive?: (match: match | null, location: Location) => boolean;
  /** The location to match against. Defaults to the current history location */
  location?: Location;
  /** If true, trailing slashes on the path will be considered when matching */
  strict?: boolean;
  /** The location to navigate to. Can be a string path or location descriptor object */
  to: LocationDescriptor;
  /** Custom component to use instead of the default anchor element */
  component?: React.ComponentType;
  /** Callback fired when an active link is clicked */
  onActiveClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * A <Link> wrapper that clicks extra fast and knows if it's "active" or not.
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
  replace,
  style: styleProp,
  scrollIntoViewIfNeeded,
  onClick,
  onActiveClick,
  to,
  ...rest
}: Props) => {
  const linkRef = React.useRef<HTMLAnchorElement>(null);
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

  const pathMatch = path
    ? matchPath(currentLocation.pathname, {
        // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
        path: path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1"),
        exact,
        strict,
      })
    : null;

  const isActive =
    preActive ??
    !!(isActiveProp ? isActiveProp(pathMatch, currentLocation) : pathMatch);
  const className = isActive
    ? joinClassnames(classNameProp, activeClassName)
    : classNameProp;
  const style = isActive ? { ...styleProp, ...activeStyle } : styleProp;

  React.useLayoutEffect(() => {
    if (isActive && linkRef.current && scrollIntoViewIfNeeded !== false) {
      scrollIntoView(linkRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
        boundary: (parent) => parent.id !== "sidebar",
      });
    }
  }, [linkRef, scrollIntoViewIfNeeded, isActive]);

  const shouldFastClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>): boolean =>
      event.button === 0 && // Only intercept left clicks
      !event.defaultPrevented &&
      !rest.target &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !isActive &&
      // Don't navigate if a context menu trigger inside this link is open
      !event.currentTarget.querySelector('[data-state="open"]'),
    [rest.target, isActive]
  );

  const navigateTo = React.useCallback(() => {
    if (replace) {
      history.replace(to);
    } else {
      history.push(to);
    }
  }, [to, replace]);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (isActive && !event.defaultPrevented) {
        onActiveClick?.(event);
      }

      if (shouldFastClick(event)) {
        event.currentTarget.focus();

        setPreActive(true);

        // Wait a frame until following the link
        requestAnimationFrame(() => {
          requestAnimationFrame(navigateTo);
          event.currentTarget?.blur();
        });
      }
    },
    [onClick, navigateTo, isActive, shouldFastClick]
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Prevent navigation if link is active, event is synthetic, or context menu is open
      if (
        isActive ||
        !event.isTrusted ||
        event.currentTarget.querySelector('[data-state="open"]')
      ) {
        event.preventDefault();
      }
    },
    [isActive]
  );

  React.useEffect(() => {
    setPreActive(undefined);
  }, [currentLocation]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (["Enter", " "].includes(event.key)) {
        navigateTo();
        event.currentTarget?.blur();
      }
    },
    [navigateTo]
  );

  return (
    <Link
      key={isActive ? "active" : "inactive"}
      ref={linkRef}
      // Note do not use `onPointerDown` here as it makes the mobile sidebar unscrollable
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      aria-current={(isActive && ariaCurrent) || undefined}
      className={className}
      style={style}
      to={toLocation}
      replace={replace}
      {...rest}
    />
  );
};

export default NavLink;
