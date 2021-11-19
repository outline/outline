import * as React from "react";
import { NavLink, Route } from "react-router-dom";

type Props = React.ComponentProps<typeof NavLink> & {
  children?: (match: any) => React.ReactNode;
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
      {({ match }) => (
        <NavLink {...rest} to={to} exact={exact} ref={ref}>
          {children ? children(match) : null}
        </NavLink>
      )}
    </Route>
  );
}

export default React.forwardRef<HTMLAnchorElement, Props>(
  NavLinkWithChildrenFunc
);
