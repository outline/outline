// @flow
import * as React from "react";
import styled, { withTheme } from "styled-components";
import { NavLink } from "react-router-dom";
import { lighten } from "polished";

type Props = {
  theme: Object,
};

const StyledNavLink = styled(NavLink)`
  position: relative;
  top: 1px;

  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  color: ${props => props.theme.textTertiary};
  margin-right: 24px;
  padding-bottom: 8px;

  &:hover {
    color: ${props => props.theme.textSecondary};
    border-bottom: 3px solid ${props => props.theme.divider};
    padding-bottom: 5px;
  }

  &:focus {
    outline: none;
    border-bottom: 3px solid
      ${props => lighten(0.4, props.theme.buttonBackground)};
    padding-bottom: 5px;
  }
`;

function Tab(props: Props) {
  const activeStyle = {
    paddingBottom: "5px",
    borderBottom: `3px solid ${props.theme.textSecondary}`,
    color: props.theme.textSecondary,
  };

  return <StyledNavLink {...props} activeStyle={activeStyle} />;
}

export default withTheme(Tab);
