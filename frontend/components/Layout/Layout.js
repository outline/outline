// @flow
import React from 'react';
import { browserHistory, Link } from 'react-router';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import _ from 'lodash';
import { Flex } from 'reflexbox';
import { color, fontSize } from 'styles/constants';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import LoadingIndicator from 'components/LoadingIndicator';
import UserStore from 'stores/UserStore';

type Props = {
  children?: ?React.Element<any>,
  actions?: ?React.Element<any>,
  title?: ?React.Element<any>,
  titleText?: string,
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
    // if (!this.props.user) return;
    _.defer(() => browserHistory.push('/search'));
  }

  @keydown(['d'])
  dashboard() {
    // if (!this.props.user) return;
    _.defer(() => browserHistory.push('/'));
  }

  render() {
    const user = this.props.user;

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

        {this.props.loading && <LoadingIndicator />}

        {this.props.notifications}

        <Header justify="space-between" align="center">
          <HeaderLeft align="center">
            <LogoLink to="/">Atlas</LogoLink>
            <Title>
              {this.props.title}
            </Title>
          </HeaderLeft>
          <Flex>
            <Flex>
              {this.props.actions}
            </Flex>
            {user.user &&
              <Flex>
                {this.props.search &&
                  <Flex>
                    <Search onClick={this.search} title="Search (/)">
                      <img
                        src={require('assets/icons/search.svg')}
                        alt="Search"
                      />
                    </Search>
                  </Flex>}
                <DropdownMenu label={<Avatar src={user.user.avatarUrl} />}>
                  <MenuItem to="/settings">Settings</MenuItem>
                  <MenuItem to="/keyboard-shortcuts">
                    Keyboard shortcuts
                  </MenuItem>
                  <MenuItem to="/developers">API</MenuItem>
                  <MenuItem onClick={user.logout}>Logout</MenuItem>
                </DropdownMenu>
              </Flex>}
          </Flex>
        </Header>

        <Content justify="center" auto>
          {this.props.children}
        </Content>
      </Container>
    );
  }
}

const LogoLink = styled(Link)`
  font-family: 'Atlas Grotesk';
  font-weight: bold
  color: ${color.text};
  text-decoration: none;
  font-size: ${fontSize.medium};
`;

const Title = styled.span`
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
  padding: 0 20px;

  z-index: 1;
  background: #fff;
  height: $headerHeight;
  // border-bottom: 1px solid #eee;
  box-shadow: 0 0 20px rgba(223, 228, 233, 0.32);

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

const Content = styled(Flex)`
  height: 100%;
  overflow: scroll;
`;

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

export default inject('user')(Layout);
