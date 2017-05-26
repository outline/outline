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
import { textColor, headerHeight } from 'styles/constants.scss';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';
import LoadingIndicator from 'components/LoadingIndicator';
import UserStore from 'stores/UserStore';

type Props = {
  history: Object,
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  loading?: boolean,
  user: UserStore,
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
          title="Atlas"
          meta={[
            {
              name: 'viewport',
              content: 'width=device-width, initial-scale=1.0',
            },
          ]}
        />

        {this.props.loading && <LoadingIndicator />}

        {this.props.notifications}

        <Header>
          <Flex align="center">
            <LogoLink to="/">Atlas</LogoLink>
            <Title>
              {this.props.title}
            </Title>
          </Flex>
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
                          <SearchIcon src={searchIcon} alt="Search" />
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

        <Content auto justify="center">
          {this.props.children}
        </Content>
      </Container>
    );
  }
}

const Container = styled(Flex)`
  width: 100%;
  height: 100%;
`;

const Header = styled(Flex)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 0 20px;

  z-index: 1;
  background: #fff;
  height: ${headerHeight};
  border-bottom: 1px solid #eee;

  font-size: 14px;
  line-height: 1;
`;

const LogoLink = styled(Link)`
  font-family: 'Atlas Grotesk';
  font-weight: bold;
  color: ${textColor};
  text-decoration: none;
  font-size: 16px;
`;

const Title = styled.span`
  color: #ccc;

  a {
    color: #ccc;
  }

  a:hover {
    color: $textColor;
  }
`;

const Search = styled(Flex)`
  margin: 0 5px;
  padding: 15px 5px 0 5px;
  cursor: pointer;
`;

const SearchIcon = styled.img`
  height: 20px;
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const MenuLink = styled(Link)`
  color: ${textColor};
`;

const Content = styled(Flex)`
  height: 100%;
  overflow: scroll;
`;

export default withRouter(inject('user')(Layout));
