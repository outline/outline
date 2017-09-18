// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { layout, color, fontWeight } from 'styles/constants';
import styled from 'styled-components';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.semiBold,
};

// $FlowFixMe :/
const styleComponent = component => styled(component)`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 5px ${layout.hpadding};
  color: ${color.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${color.text};
  }
`;

function SidebarLink(props: Object) {
  const Component = styleComponent(props.to ? NavLink : 'div');
  return <Component exact activeStyle={activeStyle} {...props} />;
}

export default SidebarLink;
