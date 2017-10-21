// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { color, fontWeight } from 'styles/constants';
import styled from 'styled-components';
import Flex from 'components/Flex';
import CollapsedIcon from 'components/Icon/CollapsedIcon';

const activeStyle = {
  color: color.black,
  fontWeight: fontWeight.semiBold,
};

// This is a hack for `styleComponent()` as NavLink fails to render without `to` prop
const StyleableDiv = props => <div {...props} />;

const StyledGoTo = styled(CollapsedIcon)`
  margin-right: -10px;

  svg {
    margin-bottom: -4px;
    margin-right: 6px;

    ${({ expanded }) => !expanded && 'transform: rotate(-90deg);'}
  }
`;

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const styleComponent = component => styled(component)`
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 0;
  margin-left: ${({ hasChildren }) => (hasChildren ? '-20px;' : '0')};
  color: ${color.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${color.text};
  }

  &.active {
    svg {
      fill: ${activeStyle.color}
    }
  }
`;

type Props = {
  to?: string,
  onClick?: SyntheticEvent => *,
  children?: React$Element<*>,
  icon?: React$Element<*>,
  hasChildren?: boolean,
  expanded?: boolean,
};

function SidebarLink({ icon, children, expanded, ...rest }: Props) {
  const Component = styleComponent(rest.to ? NavLink : StyleableDiv);

  return (
    <Flex>
      <Component exact activeStyle={activeStyle} {...rest}>
        {icon && <IconWrapper>{icon}</IconWrapper>}
        {rest.hasChildren && <StyledGoTo expanded={expanded} />}
        <Content>{children}</Content>
      </Component>
    </Flex>
  );
}

const Content = styled.div`
  width: 100%;
`;

export default SidebarLink;
