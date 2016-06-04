import React from 'react';
import Link from 'react-router/lib/Link';
import { observe } from 'mobx';

import store from 'stores/UserStore';

import DropdownMenu, { MenuItem } from 'components/DropdownMenu';
import Flex from 'components/Flex';
import LoadingIndicator from 'components/LoadingIndicator';
import { Avatar } from 'rebass';

import styles from './Layout.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class Layout extends React.Component {
  static propTypes = {
    actions: React.PropTypes.node,
    title: React.PropTypes.node,
    fixed: React.PropTypes.bool,
    loading: React.PropTypes.bool,
  }

  render() {
    return (
      <div className={ styles.container }>
        { this.props.loading ? (
          <LoadingIndicator />
        ) : null }
        <div className={ cx(styles.header, { fixed: this.props.fixed }) }>
          <div className={ styles.teamName }>
            <Link to="/">{ store.team.name }</Link>
          </div>
          <Flex align="center" className={ styles.title }>
            { this.props.title }
          </Flex>
          <Flex direction="row">
            <Flex align="center" className={ styles.actions }>
              { this.props.actions }
            </Flex>

            <DropdownMenu label={
              <Avatar
                circle
                size={24}
                src={ store.user.avatarUrl }
              />
            }>
              <MenuItem onClick={ store.logout }>Logout</MenuItem>
            </DropdownMenu>
          </Flex>
        </div>

        <div className={ styles.content }>
          { this.props.children }
        </div>
      </div>
    );
  }
}

export default Layout;