// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { layout, color } from 'styles/constants';
import { darken } from 'polished';
import styled from 'styled-components';

const activeStyle = {
  color: '#000000',
};

function SidebarLink(props: Object) {
  return <StyledNavLink exact {...props} activeStyle={activeStyle} />;
}

const StyledNavLink = styled(NavLink)`
  display: block;
  padding: 5px ${layout.hpadding};
  color: ${color.slateDark};

  &:hover {
    color: ${darken(0.1, color.slateDark)};
  }
`;

export default SidebarLink;
