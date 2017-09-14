// @flow
import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class AccountMenu extends Component {
  props: {
    label?: React$Element<any>,
    history: Object,
    ui: UiStore,
    auth: AuthStore,
  };

  handleOpenKeyboardShortcuts = () => {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  };

  handleOpenSettings = () => {
    this.props.ui.setActiveModal('settings');
  };

  handleLogout = () => {
    this.props.auth.logout();
    this.props.history.push('/');
  };

  render() {
    return (
      <DropdownMenu
        style={{ marginRight: 10, marginTop: -10 }}
        label={this.props.label}
      >
        <DropdownMenuItem onClick={this.handleOpenSettings}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={this.handleOpenKeyboardShortcuts}>
          Keyboard shortcuts
        </DropdownMenuItem>
        <Link to="/developers">
          <DropdownMenuItem>API documentation</DropdownMenuItem>
        </Link>
        <DropdownMenuItem onClick={this.handleLogout}>
          Logout
        </DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('ui', 'auth')(AccountMenu));
