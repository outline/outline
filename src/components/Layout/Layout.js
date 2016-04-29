import React from 'react';
import { connect } from 'react-redux';

import styles from './Layout.scss';

class Layout extends React.Component {
  static propTypes = {

  }

  render() {
    return (
      <div className={ styles.container }>
        <div className={ styles.header }>
          <div className={ styles.teamName }>Coinbase</div>
          <div className={ styles.user }>
            <img src={ this.props.avatarUrl } />
          </div>
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
    avatarUrl: state.user ? state.user.avatarUrl : null,
  }
};

export default connect(mapStateToProps)(Layout);