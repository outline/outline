// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { NavLink, withRouter } from 'react-router-dom';
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
    return <Link exact {...this.props} activeStyle={activeStyle} />;
  }
}

const Link = styled(NavLink)`
  padding: 5px 0;
  color: #848484;
`;

export default withRouter(SidebarLink);
