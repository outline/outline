// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { color, fontWeight } from 'styles/constants';
import styled from 'styled-components';

import Flex from 'components/Flex';
import ChevronIcon from 'components/Icon/ChevronIcon';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.semiBold,
};

// This is a hack for `styleComponent()` as NavLink fails to render without `to` prop
const StyleableDiv = props => <div {...props} />;

const styleComponent = component => styled(component)`
  display: flex;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 5px 0;
  margin-left: ${({ hasChildren }) => (hasChildren ? '-20px;' : '0')};
  color: ${color.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${color.text};
  }

  &.active ${StyledChevron} svg {
    fill: ${activeStyle.color};
  }
`;

function SidebarLink(props: Object) {
  const Component = styleComponent(props.to ? NavLink : StyleableDiv);

  return (
    <Flex>
      <Component exact activeStyle={activeStyle} {...props}>
        {props.hasChildren && <StyledChevron expanded={props.expanded} />}
        <div>{props.children}</div>
      </Component>
    </Flex>
  );
}

const StyledChevron = styled(ChevronIcon)`
  margin-right: -10px;

  svg {
    height: 18px;
    margin-bottom: -4px;
    margin-right: 6px;

    fill: ${color.slateDark};

    ${({ expanded }) => expanded && 'transform: rotate(90deg);'}
  }
`;

export default SidebarLink;
