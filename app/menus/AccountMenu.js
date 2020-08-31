// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import { SunIcon, MoonIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";
import Flex from "components/Flex";
import Modal from "components/Modal";
import {
  developers,
  changelog,
  githubIssuesUrl,
  mailToUrl,
  settings,
} from "../../shared/utils/routeHelpers";

type Props = {
  label: React.Node,
  ui: UiStore,
  auth: AuthStore,
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
    const { ui } = this.props;

    return (
      <>
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
          <DropdownMenuItem href={mailToUrl()} target="_blank">
            Send us feedback
          </DropdownMenuItem>
          <DropdownMenuItem href={githubIssuesUrl()} target="_blank">
            Report a bug
          </DropdownMenuItem>
          <hr />
          <DropdownMenu
            position="right"
            style={{
              left: 170,
              position: "relative",
              top: -40,
            }}
            label={
              <DropdownMenuItem>
                <ChangeTheme justify="space-between">
                  Appearance
                  {ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />}
                </ChangeTheme>
              </DropdownMenuItem>
            }
            hover
          >
            <DropdownMenuItem
              onClick={() => ui.setTheme("system")}
              selected={ui.theme === "system"}
            >
              System
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => ui.setTheme("light")}
              selected={ui.theme === "light"}
            >
              Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => ui.setTheme("dark")}
              selected={ui.theme === "dark"}
            >
              Dark
            </DropdownMenuItem>
          </DropdownMenu>
          <hr />
          <DropdownMenuItem onClick={this.handleLogout}>
            Log out
          </DropdownMenuItem>
        </DropdownMenu>
      </>
    );
  }
}

const ChangeTheme = styled(Flex)`
  width: 100%;
`;

export default inject("ui", "auth")(AccountMenu);
