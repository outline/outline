// @flow
import * as React from 'react';
import { Link } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { SunIcon, MoonIcon } from 'outline-icons';
import styled, { withTheme } from 'styled-components';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import Flex from 'shared/components/Flex';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
import Modal from 'components/Modal';
import KeyboardShortcuts from 'scenes/KeyboardShortcuts';
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  spectrumUrl,
  settings,
} from '../../shared/utils/routeHelpers';

type Props = {
  label: React.Node,
  ui: UiStore,
  auth: AuthStore,
  theme: Object,
};

@observer
class AccountMenu extends React.Component<Props> {
  @observable keyboardShortcutsOpen: boolean = false;

  handleLogout = () => {
    this.props.auth.logout();
  };

  handleOpenKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = true;
  };

  handleCloseKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = false;
  };

  render() {
    const { ui, theme } = this.props;
    const isLightTheme = ui.theme === 'light';

    return (
      <React.Fragment>
        <Modal
          isOpen={this.keyboardShortcutsOpen}
          onRequestClose={this.handleCloseKeyboardShortcuts}
          title="Keyboard shortcuts"
        >
          <KeyboardShortcuts />
        </Modal>
        <DropdownMenu
          style={{ marginRight: 10, marginTop: -10 }}
          label={this.props.label}
        >
          <DropdownMenuItem as={Link} to={settings()}>
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
          <DropdownMenuItem onClick={ui.toggleDarkMode}>
            <ChangeTheme justify="space-between">
              {isLightTheme ? (
                <React.Fragment>
                  Dark theme <MoonIcon />
                </React.Fragment>
              ) : (
                <React.Fragment>
                  Light theme <SunIcon />
                </React.Fragment>
              )}
            </ChangeTheme>
          </DropdownMenuItem>
          <hr />
          <DropdownMenuItem onClick={this.handleLogout}>
            Log out
          </DropdownMenuItem>
        </DropdownMenu>
      </React.Fragment>
    );
  }
}

const ChangeTheme = styled(Flex)`
  width: 100%;
`;

export default inject('ui', 'auth')(withTheme(AccountMenu));
