// @flow
import { lighten } from "polished";
import * as React from "react";
import { NavLink } from "react-router-dom";
import styled, { withTheme } from "styled-components";

type Props = {
  theme: Object,
};

const StyledNavLink = styled(NavLink)`
  position: relative;
  bottom: -1px;

  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  margin-right: 24px;
  padding-bottom: 8px;

  &:hover {
    color: ${(props) => props.theme.textSecondary};
    border-bottom: 3px solid ${(props) => props.theme.divider};
    padding-bottom: 5px;
  }

  &:focus {
    outline: none;
    border-bottom: 3px solid
      ${(props) => lighten(0.4, props.theme.buttonBackground)};
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
