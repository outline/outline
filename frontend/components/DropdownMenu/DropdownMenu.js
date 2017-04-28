import React from 'react';
import { browserHistory } from 'react-router';

import styles from './DropdownMenu.scss';

class MenuItem extends React.Component {
  onClick = () => {
    if (this.props.to) {
      browserHistory.push(this.props.to);
    } else {
      this.props.onClick();
    }
  };

  render() {
    return (
      <div className={styles.menuItem} onClick={this.onClick}>
        {this.props.children}
      </div>
    );
  }
}

MenuItem.propTypes = {
  onClick: React.PropTypes.func,
  to: React.PropTypes.string,
  children: React.PropTypes.node.isRequired,
};

//

class DropdownMenu extends React.Component {
  static propTypes = {
    label: React.PropTypes.node.isRequired,
    children: React.PropTypes.node.isRequired,
  };

  state = {
    menuVisible: false,
  };

  onMouseEnter = () => {
    this.setState({ menuVisible: true });
  };

  onMouseLeave = () => {
    this.setState({ menuVisible: false });
  };

  onClick = () => {
    this.setState({ menuVisible: !this.state.menuVisible });
  };

  render() {
    return (
      <div
        className={styles.menuContainer}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <div className={styles.label} onClick={this.onClick}>
          {this.props.label}
        </div>

        {this.state.menuVisible
          ? <div className={styles.menu}>
              {this.props.children}
            </div>
          : null}
      </div>
    );
  }
}

export default DropdownMenu;
export { MenuItem };
