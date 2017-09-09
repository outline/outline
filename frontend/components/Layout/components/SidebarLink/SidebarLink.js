// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { layout, color, fontWeight } from 'styles/constants';
import styled from 'styled-components';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.semiBold,
};

function SidebarLink(props: Object) {
  return <StyledNavLink exact activeStyle={activeStyle} {...props} />;
}

const StyledNavLink = styled(NavLink)`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 5px ${layout.hpadding};
  color: ${color.slateDark};
  font-size: 15px;

  &:hover {
    color: ${color.text};
  }
`;

export default SidebarLink;
