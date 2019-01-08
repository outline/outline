// @flow
import * as React from 'react';
import styled, { withTheme } from 'styled-components';
import { NavLink } from 'react-router-dom';

const NavItem = styled(NavLink)`
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: ${props => props.theme.slate};
  letter-spacing: 0.04em;
  margin-right: 24px;
  padding-bottom: 8px;

  &:hover {
    color: ${props => props.theme.slateDark};
  }
`;

function Tab(props: *) {
  const activeStyle = {
    paddingBottom: '5px',
    borderBottom: `3px solid ${props.theme.slateLight}`,
    color: props.theme.slate,
  };

  return <NavItem {...props} activeStyle={activeStyle} />;
}

export default withTheme(Tab);
