import * as React from "react";
import type { Match } from "react-router-dom";
import { NavLink, Route } from "react-router-dom";

type Props = {
  children?: (match: Match) => React.ReactNode;
  exact?: boolean;
  to: string;
};
export default function NavLinkWithChildrenFunc({
  to,
  exact = false,
  children,
  ...rest
}: Props) {
  return (
    <Route path={to} exact={exact}>
      {({ match }) => (
        <NavLink {...rest} to={to} exact={exact}>
          {children ? children(match) : null}
        </NavLink>
      )}
    </Route>
  );
}
