// @flow
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import _ from 'lodash';
import keydown from 'react-keydown';
import searchIcon from 'assets/icons/search.svg';
import { Flex } from 'reflexbox';
import constants, { color, fontSize } from 'styles/constants';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import LayoutSidebar from './components/LayoutSidebar';
import LayoutLoading from './components/LayoutLoading';
import UserStore from 'stores/UserStore';
import UiStore from 'stores/UiStore';

type Props = {
  history: Object,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  titleText?: string,
  showMenu: ?boolean,
  loading?: boolean,
  user: UserStore,
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
    if (!this.props.user) return;
    _.defer(() => this.props.history.push('/search'));
  }

  @keydown(['d'])
  dashboard() {
    if (!this.props.user) return;
    _.defer(() => this.props.history.push('/'));
  }

  render() {
    const user = this.props.user;

    const handleLogout = () => {
      user.logout(() => this.props.history.push('/'));
    };

    return (
      <Container column auto>
        <Helmet
          title={
            this.props.titleText ? `${this.props.titleText} - Atlas` : 'Atlas'
          }
          meta={[
            {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
            },
          ]}
        />

        {this.props.loading && <LayoutLoading />}
        {this.props.notifications}

        <Header justify="space-between" align="center">
          <HeaderLeft align="center">
            <MenuContainer>
              <MenuIcon
                src={require('assets/icons/menu.svg')}
                alt="Menu"
                title="Toggle menu (Cmd+/)"
                onClick={this.props.ui.toggleSidebar}
              />
            </MenuContainer>
            <LogoLink to="/">Atlas</LogoLink>
            <Title>
              {this.props.title}
            </Title>
          </HeaderLeft>
          <Flex>
            <Flex>
              <Flex align="center">
                {this.props.actions}
              </Flex>
              {user.user &&
                <Flex>
                  {this.props.search &&
                    <Flex>
                      <Link to="/search">
                        <Search title="Search (/)">
                          <img src={searchIcon} alt="Search" />
                        </Search>
                      </Link>
                    </Flex>}
                  <DropdownMenu label={<Avatar src={user.user.avatarUrl} />}>
                    <MenuLink to="/settings">
                      <MenuItem>Settings</MenuItem>
                    </MenuLink>
                    <MenuLink to="/keyboard-shortcuts">
                      <MenuItem>
                        Keyboard shortcuts
                      </MenuItem>
                    </MenuLink>
                    <MenuLink to="/developers">
                      <MenuItem>API</MenuItem>
                    </MenuLink>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </DropdownMenu>
                </Flex>}
            </Flex>
          </Flex>
        </Header>

        <ContentWrapper auto>
          <LayoutSidebar />
          <Content justify="center" auto>
            {this.props.children}
          </Content>
        </ContentWrapper>
      </Container>
    );
  }
}

const MenuContainer = styled(Flex)`
  margin: 2px 12px 0 -4px;
`;

const MenuIcon = styled.img`
  width: 22px;
  height: 22px;
  cursor: pointer;
`;

const LogoLink = styled(Link)`
  font-family: 'Atlas Grotesk';
  font-weight: bold
  color: ${color.text};
  text-decoration: none;
  font-size: ${fontSize.medium};
`;

const Title = styled.span`
  padding-left: 20px;
  color: ${color.gray};

  a {
    color: ${color.gray};
  }

  a:hover {
    color: ${color.text};
  }
`;

const Container = styled(Flex)`
  width: 100%;
  height: 100%;
`;

const Header = styled(Flex)`
  padding: 0 25px;

  z-index: 1;
  background: ${color.white};
  height: ${constants.headerHeight};

  font-size: 14px;
  line-height: 1;
`;

const HeaderLeft = styled(Flex)`
  .team {
    font-family: 'Atlas Grotesk';
    font-weight: bold;
    color: $textColor;
    text-decoration: none;
    font-size: 16px;
  }

  .title {
    color: #ccc;

    a {
      color: #ccc;
    }

    a:hover {
      color: $textColor;
    }
  }
`;

const Search = styled(Flex)`
  margin: 0 5px;
  padding: 15px 5px 0 5px;
  cursor: pointer;

  img {
    height: 20px;
  }
`;

const ContentWrapper = styled(Flex)`
  height: 100%;
`;

const Content = styled(Flex)`
  height: 100%;
  overflow: scroll;
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const MenuLink = styled(Link)`
  color: ${color.text};
`;

export default withRouter(inject('user', 'ui')(Layout));
