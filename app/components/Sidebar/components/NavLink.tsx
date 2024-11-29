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

export interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  activeClassName?: string;
  activeStyle?: React.CSSProperties;
  scrollIntoViewIfNeeded?: boolean;
  exact?: boolean;
  replace?: boolean;
  isActive?: (match: match | null, location: Location) => boolean;
  location?: Location;
  strict?: boolean;
  to: LocationDescriptor;
  onBeforeClick?: () => void;
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
  onBeforeClick,
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

  const match = path
    ? matchPath(currentLocation.pathname, {
        // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
        path: path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1"),
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

  React.useLayoutEffect(() => {
    if (isActive && linkRef.current && scrollIntoViewIfNeeded !== false) {
      // If the page has an anchor hash then this means we're linking to an
      // anchor in the document – smooth scrolling the sidebar may the scrolling
      // to the anchor of the document so we must avoid it.
      if (!window.location.hash) {
        scrollIntoView(linkRef.current, {
          scrollMode: "if-needed",
          behavior: "auto",
        });
      }
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
      !isActive,
    [rest.target, isActive]
  );

  const navigateTo = React.useCallback(() => {
    if (replace) {
      history.replace(to);
    } else {
      history.push(to);
    }
  }, [to, replace]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (shouldFastClick(event)) {
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.focus();

        setPreActive(true);

        // Wait a frame until following the link
        requestAnimationFrame(() => {
          requestAnimationFrame(navigateTo);
          event.currentTarget?.blur();
        });
      }
    },
    [onClick, navigateTo, shouldFastClick]
  );

  React.useEffect(() => {
    setPreActive(undefined);
  }, [currentLocation]);

  return (
    <Link
      key={isActive ? "active" : "inactive"}
      ref={linkRef}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (["Enter", " "].includes(event.key)) {
          navigateTo();
          event.currentTarget?.blur();
        }
      }}
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
