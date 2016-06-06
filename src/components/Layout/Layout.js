import React from 'react';
import Link from 'react-router/lib/Link';
import Helmet from 'react-helmet';
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
    titleText: React.PropTypes.node,
    fixed: React.PropTypes.bool,
    loading: React.PropTypes.bool,
  }

  render() {
    return (
      <div className={ styles.container }>
        <Helmet
          title={
            this.props.titleText
              ? `${this.props.titleText} - Beautiful Atlas`
              : 'Beautiful Atlas'
          }
        />

        { this.props.loading ? (
          <LoadingIndicator />
        ) : null }
        <div className={ cx(styles.header, { fixed: this.props.fixed }) }>
          <div className={ styles.headerLeft }>
            <Link to="/" className={ styles.team }>{ store.team.name }</Link>
            <span className={ styles.title }>
              { this.props.title && (<span>&nbsp;/&nbsp;</span>) }{ this.props.title }
            </span>
          </div>
          <Flex direction="row" className={ styles.headerRight }>
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

        <div className={ cx(styles.content, { fixed: this.props.fixed }) }>
          { this.props.children }
        </div>
      </div>
    );
  }
}

export default Layout;