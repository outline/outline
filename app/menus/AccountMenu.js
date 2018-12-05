// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  spectrumUrl,
} from '../../shared/utils/routeHelpers';

type Props = {
  label: React.Node,
  history: Object,
  ui: UiStore,
  auth: AuthStore,
};

@observer
class AccountMenu extends React.Component<Props> {
  handleOpenKeyboardShortcuts = () => {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  };

  handleOpenSettings = () => {
    this.props.history.push('/settings');
  };

  handleLogout = () => {
    this.props.auth.logout();
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
        <DropdownMenuItem href={developers()} target="_blank">
          API documentation
        </DropdownMenuItem>
        <hr />
        <DropdownMenuItem href={changelog()} target="_blank">
          Changelog
        </DropdownMenuItem>
        <DropdownMenuItem href={spectrumUrl()} target="_blank">
          Community
        </DropdownMenuItem>
        <DropdownMenuItem href={mailToUrl()} target="_blank">
          Send us feedback
        </DropdownMenuItem>
        <DropdownMenuItem href={githubIssuesUrl()} target="_blank">
          Report a bug
        </DropdownMenuItem>
        <hr />
        <DropdownMenuItem onClick={this.handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('ui', 'auth')(AccountMenu));
