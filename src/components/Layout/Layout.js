import React from 'react';
import _truncate from 'lodash/truncate';
import { connect } from 'react-redux';
import Link from 'react-router/lib/Link';

import HeaderMenu from './components/HeaderMenu';
import Flex from 'components/Flex';

import styles from './Layout.scss';

class Layout extends React.Component {
  static propTypes = {
    actions: React.PropTypes.node,
    title: React.PropTypes.string,
  }

  render() {
    return (
      <div className={ styles.container }>
        <div className={ styles.header }>
          <div className={ styles.teamName }>
            <Link to="/">{ this.props.teamName }</Link>
          </div>
          <Flex align="center" className={ styles.title }>
            { this.props.title ? (
              <span title={this.props.title}>{ _truncate(this.props.title, 60) }</span>
            ) : (
              <span className={ styles.untitled }>Untitled document</span>
            )}
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