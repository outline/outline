// ref: https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/modules/NavLink.js
// This file is pulled almost 100% from react-router with the addition of one
// thing, automatic scroll to the active link. It's worth the copy paste because
// it avoids recalculating the link match again.
import type { Location, LocationDescriptor } from "history";
import { createLocation } from "history";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
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

interface PendingNavigation {
  /** The current location when the fast click began. */
  from: Location;
  /** The target location of the fast click. */
  to: Location;
}

// The target of a fast-click navigation, shared between all NavLinks so that
// only links matching it can render as active before the location changes.
// Only honored while `from` is still the current location, so a stale value
// cannot influence rendering after navigation.
const pendingNavigation = observable.box<PendingNavigation | null>(null, {
  deep: false,
});

const setPendingNavigation = action((value: PendingNavigation | null) => {
  pendingNavigation.set(value);
});

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
const NavLink = observer(function NavLink({
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
}: Props) {
  const linkRef = React.useRef<HTMLAnchorElement>(null);
  const context = React.useContext(RouterContext);
  const currentLocation = locationProp || context.location;
  // While a fast-click navigation is pending, derive active state from its
  // target so the outgoing link deactivates immediately.
  const pending = pendingNavigation.get();
  const activeLocation =
    pending && pending.from === currentLocation ? pending.to : currentLocation;
  const toLocation = normalizeToLocation(
    resolveToLocation(to, currentLocation),
    currentLocation
  );
  const { pathname: path } = toLocation;

  const pathMatch = path
    ? matchPath(activeLocation.pathname, {
        // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
        path: path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1"),
        exact,
        strict,
      })
    : null;

  const isActive = !!(isActiveProp
    ? isActiveProp(pathMatch, activeLocation)
    : pathMatch);
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

  // Whether the link was active when the click gesture began, so a fast click
  // is not also treated as a click on an already-active link.
  const wasActiveAtMouseDown = React.useRef<boolean>();

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      wasActiveAtMouseDown.current = isActive;
      onClick?.(event);

      if (shouldFastClick(event)) {
        // Capture the element as React nulls currentTarget once the handler
        // returns, which would make the deferred blur a no-op.
        const element = event.currentTarget;
        element.focus();

        setPendingNavigation({
          from: currentLocation,
          to: createLocation(toLocation, undefined, undefined, currentLocation),
        });

        // Wait a frame until following the link
        requestAnimationFrame(() => {
          requestAnimationFrame(navigateTo);
          element.blur();
        });
      }
    },
    [
      onClick,
      navigateTo,
      shouldFastClick,
      toLocation,
      currentLocation,
      isActive,
    ]
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Keyboard-triggered clicks have no preceding mousedown, fall back to
      // the current active state.
      const wasActive = wasActiveAtMouseDown.current ?? isActive;
      wasActiveAtMouseDown.current = undefined;

      // Prevent navigation if link is active, event is synthetic, or context menu is open
      if (
        isActive ||
        !event.isTrusted ||
        event.currentTarget.querySelector('[data-state="open"]')
      ) {
        event.preventDefault();
      }

      // Fire onActiveClick on click rather than mousedown so that the native
      // HTML5 drag gesture can initiate from an active row without being
      // blocked by a preventDefault on mousedown.
      if (isActive && wasActive) {
        onActiveClick?.(event);
      }
    },
    [isActive, onActiveClick]
  );

  // Release a pending navigation once it is no longer honored, without
  // disturbing one that is still in flight.
  React.useEffect(() => {
    const value = pendingNavigation.get();
    if (value && value.from !== currentLocation) {
      setPendingNavigation(null);
    }
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
});

export default NavLink;
