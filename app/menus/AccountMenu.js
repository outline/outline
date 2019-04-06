// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { MoonIcon } from 'outline-icons';
import styled, { withTheme } from 'styled-components';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import Flex from 'shared/components/Flex';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';
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
  handleOpenKeyboardShortcuts = () => {
    this.props.ui.setActiveModal('keyboard-shortcuts');
  };

  handleLogout = () => {
    this.props.auth.logout();
  };

  render() {
    const { ui, theme } = this.props;
    const isLightTheme = ui.theme === 'light';

    return (
      <DropdownMenu
        style={{ marginRight: 10, marginTop: -10 }}
        label={this.props.label}
      >
        <DropdownMenuItem href={settings()}>Settings</DropdownMenuItem>
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
          <NightMode justify="space-between">
            Night Mode{' '}
            <MoonIcon
              color={isLightTheme ? theme.textSecondary : theme.primary}
            />
          </NightMode>
        </DropdownMenuItem>
        <hr />
        <DropdownMenuItem onClick={this.handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenu>
    );
  }
}

const NightMode = styled(Flex)`
  width: 100%;
`;

export default inject('ui', 'auth')(withTheme(AccountMenu));
