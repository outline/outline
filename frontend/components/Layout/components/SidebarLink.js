// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { color, fontWeight } from 'styles/constants';
import styled from 'styled-components';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.semiBold,
};

// This is a hack for `styleComponent()` as NavLink fails to render without `to` prop
const StyleableDiv = props => <div {...props} />;

const styleComponent = component => styled(component)`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 5px 24px;
  color: ${color.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${color.text};
  }
`;

function SidebarLink(props: Object) {
  const Component = styleComponent(props.to ? NavLink : StyleableDiv);
  return <Component exact activeStyle={activeStyle} {...props} />;
}

export default SidebarLink;
