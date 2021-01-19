// @flow
import * as React from "react";
import { NavLink } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import { type Theme } from "types";

type Props = {
  theme: Theme,
  right?: boolean,
};

const StyledNavLink = styled(NavLink)`
  position: relative;

  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  margin-left: ${(props) => (props.right ? "24px" : 0)};
  margin-right: ${(props) => (props.right ? 0 : "24px")};
  padding-bottom: 8px;
  float: ${(props) => (props.right ? "right" : "left")};

  &:hover {
    color: ${(props) => props.theme.textSecondary};
    border-bottom: 3px solid ${(props) => props.theme.divider};
    padding-bottom: 5px;
  }
`;

function Tab({ theme, ...rest }: Props) {
  const activeStyle = {
    paddingBottom: "5px",
    borderBottom: `3px solid ${theme.textSecondary}`,
    color: theme.textSecondary,
  };

  return <StyledNavLink {...rest} activeStyle={activeStyle} />;
}

export default withTheme(Tab);
