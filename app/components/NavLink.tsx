import * as React from "react";
import { match, NavLink, Route } from "react-router-dom";

type Props = React.ComponentProps<typeof NavLink> & {
  children?: (
    match:
      | match<{
          [x: string]: string | undefined;
        }>
      | boolean
      | null
  ) => React.ReactNode;
  exact?: boolean;
  activeStyle?: React.CSSProperties;
  to: string;
};

function NavLinkWithChildrenFunc(
  { to, exact = false, children, ...rest }: Props,
  ref?: React.Ref<HTMLAnchorElement>
) {
  return (
    <Route path={to} exact={exact}>
      {({ match, location }) => (
        <NavLink {...rest} to={to} exact={exact} ref={ref}>
          {children
            ? children(rest.isActive ? rest.isActive(match, location) : match)
            : null}
        </NavLink>
      )}
    </Route>
  );
}

export default React.forwardRef<HTMLAnchorElement, Props>(
  NavLinkWithChildrenFunc
);
