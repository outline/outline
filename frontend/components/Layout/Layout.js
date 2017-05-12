// @flow
import React from 'react';
import { browserHistory, Link } from 'react-router';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import { observer, inject } from 'mobx-react';
import keydown from 'react-keydown';
import _ from 'lodash';
import { Flex } from 'reflexbox';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import LoadingIndicator from 'components/LoadingIndicator';
import UserStore from 'stores/UserStore';

import styles from './Layout.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

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
      <div className={styles.container}>
        <Helmet
          title={
            this.props.titleText ? `${this.props.titleText} - Atlas` : 'Atlas'
          }
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
                      <div
                        onClick={this.search}
                        className={styles.search}
                        title="Search (/)"
                      >
                        <img
                          src={require('assets/icons/search.svg')}
                          alt="Search"
                        />
                      </div>
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

export default inject('user')(Layout);
