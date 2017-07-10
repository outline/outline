// @flow
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import _ from 'lodash';
import keydown from 'react-keydown';
import Flex from 'components/Flex';
import { color, layout } from 'styles/constants';

import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import { LoadingIndicatorBar } from 'components/LoadingIndicator';
import Scrollable from 'components/Scrollable';
import Avatar from 'components/Avatar';

import SidebarCollection from './components/SidebarCollection';
import SidebarCollectionList from './components/SidebarCollectionList';
import SidebarLink from './components/SidebarLink';

import UserStore from 'stores/UserStore';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';
import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  user: UserStore,
  auth: AuthStore,
  ui: UiStore,
  search: ?boolean,
  notifications?: React.Element<any>,
};

@observer class Layout extends React.Component {
  props: Props;

  static defaultProps = {
    search: true,
  };

  @keydown(['/', 't'])
  search() {
    if (this.props.auth.authenticated)
      _.defer(() => this.props.history.push('/search'));
  }

  @keydown(['d'])
  dashboard() {
    if (this.props.auth.authenticated)
      _.defer(() => this.props.history.push('/'));
  }

  handleLogout = () => {
    this.props.auth.logout(() => this.props.history.push('/'));
  };

  render() {
    const { user, auth, ui } = this.props;

    return (
      <Container column auto>
        <Helmet
          title="Atlas"
          meta={[
            {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
            },
          ]}
        />

        {this.props.ui.progressBarVisible && <LoadingIndicatorBar />}

        {this.props.notifications}

        <Flex auto>
          {auth.authenticated &&
            user &&
            <Sidebar column editMode={ui.editMode}>
              <Header justify="space-between">
                <Flex align="center">
                  <LogoLink to="/">Atlas</LogoLink>
                </Flex>
                <DropdownMenu label={<Avatar src={user.user.avatarUrl} />}>
                  <MenuLink to="/settings">
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </MenuLink>
                  <MenuLink to="/keyboard-shortcuts">
                    <DropdownMenuItem>
                      Keyboard shortcuts
                    </DropdownMenuItem>
                  </MenuLink>
                  <MenuLink to="/developers">
                    <DropdownMenuItem>API</DropdownMenuItem>
                  </MenuLink>
                  <DropdownMenuItem onClick={this.handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenu>
              </Header>

              <Flex column>
                <Scrollable>
                  <LinkSection>
                    <SidebarLink to="/search">Search</SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    <SidebarLink to="/dashboard">Home</SidebarLink>
                    <SidebarLink to="/starred">Starred</SidebarLink>
                  </LinkSection>
                  <LinkSection>
                    {ui.activeCollection
                      ? <SidebarCollection
                          document={ui.activeDocument}
                          collection={ui.activeCollection}
                          history={this.props.history}
                        />
                      : <SidebarCollectionList history={this.props.history} />}
                  </LinkSection>
                </Scrollable>
              </Flex>
            </Sidebar>}

          <Content auto justify="center" editMode={ui.editMode}>
            {this.props.children}
          </Content>
        </Flex>
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: relative;
  width: 100%;
  height: 100%;
`;

const LogoLink = styled(Link)`
  margin-top: 15px;
  font-family: 'Atlas Grotesk';
  font-weight: bold;
  color: ${color.text};
  text-decoration: none;
  font-size: 16px;
`;

const MenuLink = styled(Link)`
  color: ${color.text};
`;

const Content = styled(Flex)`
  overflow: scroll;
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: ${props => (props.editMode ? 0 : layout.sidebarWidth)};
  transition: left 200ms ease-in-out;
`;

const Sidebar = styled(Flex)`
  width: ${layout.sidebarWidth};
  margin-left: ${props => (props.editMode ? `-${layout.sidebarWidth}` : 0)};
  background: rgba(250, 251, 252, 0.71);
  border-right: 1px solid #eceff3;
  transition: margin-left 200ms ease-in-out;
`;

const Header = styled(Flex)`
  flex-shrink: 0;
  padding: ${layout.padding};
  padding-bottom: 10px;
`;

const LinkSection = styled(Flex)`
  flex-direction: column;
  padding: 10px 0;
`;

export default withRouter(inject('user', 'auth', 'ui', 'collections')(Layout));
