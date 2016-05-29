import React from 'react';
import { connect } from 'react-redux';
import { logoutUser } from 'actions/UserActions';

import styles from './HeaderMenu.scss';

class HeaderMenu extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
  }

  state = {
    menuVisible: false,
  }

  onMouseEnter = () => {
    this.setState({ menuVisible: true });
  }

  onMouseLeave = () => {
    this.setState({ menuVisible: false });
  }

  onClick = () => {
    this.setState({ menuVisible: !this.state.menuVisible });
  }

  logout = (event) => {
    event.preventDefault();
    this.props.logout();
  }

  render() {
    return (
      <div
        className={ styles.menu }
        onMouseEnter={ this.onMouseEnter }
        onMouseLeave={ this.onMouseLeave }
      >
        <div className={ styles.content } onClick={ this.onClick }>
          { this.props.children }
        </div>

        { this.state.menuVisible ? (
          <div className={ styles.menu }>
            <ul>
              <li>
                <a href='/' onClick={ this.logout }>Logout</a>
              </li>
            </ul>
          </div>
        ) : null }
      </div>
    );
  }
};

const mapDispatchToProps = (dispatch) => {
  return {
    logout: () => {
      dispatch(logoutUser())
    },
  }
};


export default connect(null, mapDispatchToProps)(HeaderMenu);