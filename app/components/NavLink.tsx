import * as React from "react";
import { NavLink, Route } from "react-router-dom";

type Props = {
  children?: (match: any) => React.ReactNode;
  exact?: boolean;
  to: string;
};

function NavLinkWithChildrenFunc(
  { to, exact = false, children, ...rest }: Props,
  ref: React.LegacyRef<Route>
) {
  return (
    <Route path={to} exact={exact} ref={ref}>
      {({ match }) => (
        <NavLink {...rest} to={to} exact={exact}>
          {children ? children(match) : null}
        </NavLink>
      )}
    </Route>
  );
}

export default React.forwardRef(NavLinkWithChildrenFunc);
