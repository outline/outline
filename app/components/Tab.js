// @flow
import { m } from "framer-motion";
import * as React from "react";
import { NavLink, Route } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import { type Theme } from "types";

type Props = {
  theme: Theme,
  children: React.Node,
};

const NavLinkWithChildrenFunc = ({ to, exact = false, children, ...rest }) => (
  <Route path={to} exact={exact}>
    {({ match }) => (
      <NavLink to={to} exact={exact} {...rest}>
        {children(match)}
      </NavLink>
    )}
  </Route>
);

const TabLink = styled(NavLinkWithChildrenFunc)`
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  margin-right: 24px;
  padding: 6px 0;

  &:hover {
    color: ${(props) => props.theme.textSecondary};
  }
`;

const Active = styled(m.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  width: 100%;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
  background: ${(props) => props.theme.textSecondary};
`;

const transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

function Tab({ theme, children, ...rest }: Props) {
  const activeStyle = {
    color: theme.textSecondary,
  };

  return (
    <TabLink {...rest} activeStyle={activeStyle}>
      {(match) => (
        <>
          {children}
          {match && (
            <Active
              layoutId="underline"
              initial={false}
              transition={transition}
            />
          )}
        </>
      )}
    </TabLink>
  );
}

export default withTheme(Tab);
