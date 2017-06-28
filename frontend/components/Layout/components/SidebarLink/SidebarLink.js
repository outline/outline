// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { NavLink, withRouter } from 'react-router-dom';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

const activeStyle = {
  color: '#000000',
};

@observer class SidebarLink extends React.Component {
  shouldComponentUpdate(nextProps) {
    // Navlink is having issues updating, forcing update on URL changes
    return this.props.match !== nextProps.match;
  }

  render() {
    return (
      <LinkContainer>
        <NavLink exact {...this.props} activeStyle={activeStyle} />
      </LinkContainer>
    );
  }
}

const LinkContainer = styled(Flex)`
  padding: 5px 0;
  
  a {
    color: #848484;
  }
`;

export default withRouter(SidebarLink);
