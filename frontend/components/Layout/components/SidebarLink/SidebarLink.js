// @flow
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

const activeStyle = {
  color: '#000000',
};

function SidebarLink(props: Object) {
  return (
    <LinkContainer>
      <NavLink exact {...props} activeStyle={activeStyle} />
    </LinkContainer>
  );
}

const LinkContainer = styled(Flex)`
  padding: 5px 0;

  a {
    color: #848484;
  }
`;

export default SidebarLink;
