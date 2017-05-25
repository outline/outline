// @flow
import React from 'react';
import { Link, withRouter } from 'react-router-dom';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import _ from 'lodash';
import keydown from 'react-keydown';
import classNames from 'classnames/bind';
import searchIcon from 'assets/icons/search.svg';
import { Flex } from 'reflexbox';
import { textColor } from 'styles/constants.scss';
import styles from './Layout.scss';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';
import LoadingIndicator from 'components/LoadingIndicator';
import UserStore from 'stores/UserStore';

const cx = classNames.bind(styles);

type Props = {
  history: Object,
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
      <div className={styles.container}>
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

        <div className={cx(styles.header)}>
          <div className={styles.headerLeft}>
            <Link to="/" className={styles.team}>Atlas</Link>
            <span className={styles.title}>
              {this.props.title}
            </span>
          </div>
          <Flex className={styles.headerRight}>
            <Flex>
              <Flex align="center" className={styles.actions}>
                {this.props.actions}
              </Flex>
              {user.user &&
                <Flex>
                  {this.props.search &&
                    <Flex>
                      <Link to="/search">
                        <div className={styles.search} title="Search (/)">
                          <img src={searchIcon} alt="Search" />
                        </div>
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
        </div>

        <div className={cx(styles.content)}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

const Avatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const MenuLink = styled(Link)`
  color: ${textColor};
`;

export default withRouter(inject('user')(Layout));
