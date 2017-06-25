// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { NavLink } from 'react-router-dom';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

const activeStyle = {
  color: '#000000',
};

const SidebarLink = observer(props => (
  <LinkContainer>
    <NavLink {...props} activeStyle={activeStyle} />
  </LinkContainer>
));

const LinkContainer = styled(Flex)`
  padding: 5px 0;
  
  a {
    color: #848484;
  }
`;

export default SidebarLink;
