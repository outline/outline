import React from 'react';
import { connect } from 'react-redux';
import Link from 'react-router/lib/Link';

import HeaderMenu from './components/HeaderMenu';
import Flex from 'components/Flex';
import LoadingIndicator from 'components/LoadingIndicator';

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
            <Link to="/">{ this.props.teamName }</Link>
          </div>
          <Flex align="center" className={ styles.title }>
            { this.props.title }
          </Flex>
          <Flex direction="row">
            <Flex align="center" className={ styles.actions }>
              { this.props.actions }
            </Flex>
            <HeaderMenu>
              <img src={ this.props.avatarUrl } />
            </HeaderMenu>
          </Flex>
        </div>
        <div className={ styles.content }>
          { this.props.children }
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    teamName: state.team ? state.team.name : null,
    avatarUrl: state.user ? state.user.avatarUrl : null,
  }
};

export default connect(
  mapStateToProps,
)(Layout);