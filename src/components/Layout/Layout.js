import React from 'react';
import { connect } from 'react-redux';
import Link from 'react-router/lib/Link';

import HeaderMenu from './components/HeaderMenu';

import styles from './Layout.scss';

class Layout extends React.Component {
  static propTypes = {

  }

  render() {
    return (
      <div className={ styles.container }>
        <div className={ styles.header }>
          <div className={ styles.teamName }>
            <Link to="/">{ this.props.teamName }</Link>
          </div>
          <HeaderMenu>
            <img src={ this.props.avatarUrl } />
          </HeaderMenu>
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