import { LocationDescriptor, LocationDescriptorObject } from "history";
import * as React from "react";
import { type match, NavLink, Route } from "react-router-dom";

type Props = React.ComponentProps<typeof NavLink> & {
  children?: (
    match:
      | match<{
          [x: string]: string | undefined;
        }>
      | boolean
      | null,
    location: LocationDescriptorObject
  ) => React.ReactNode;
  /**
   * If true, the tab will only be active if the path matches exactly.
   */
  exact?: boolean;
  /**
   * CSS properties to apply to the link when it is active.
   */
  activeStyle?: React.CSSProperties;
  /**
   * The path to match against the current location.
   */
  to: LocationDescriptor;
};

function NavLinkWithChildrenFunc(
  { to, exact = false, children, ...rest }: Props,
  ref?: React.Ref<HTMLAnchorElement>
) {
  return (
    <Route path={typeof to === "string" ? to : to?.pathname} exact={exact}>
      {({ match, location }) => (
        <NavLink {...rest} to={to} exact={exact} ref={ref}>
          {children
            ? children(
                rest.isActive ? rest.isActive(match, location) : match,
                location
              )
            : null}
        </NavLink>
      )}
    </Route>
  );
}

export default React.forwardRef<HTMLAnchorElement, Props>(
  NavLinkWithChildrenFunc
);
