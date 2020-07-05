// @flow
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { KeyboardIcon } from "outline-icons";
import Modal from "components/Modal";
import Tooltip from "components/Tooltip";
import NudeButton from "components/NudeButton";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";

type Props = {};

@observer
class KeyboardShortcutsButton extends React.Component<Props> {
  @observable keyboardShortcutsOpen: boolean = false;

  handleOpenKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = true;
  };

  handleCloseKeyboardShortcuts = () => {
    this.keyboardShortcutsOpen = false;
  };

  render() {
    return (
      <React.Fragment>
        <Modal
          isOpen={this.keyboardShortcutsOpen}
          onRequestClose={this.handleCloseKeyboardShortcuts}
          title="Keyboard shortcuts"
        >
          <KeyboardShortcuts />
        </Modal>
        <Tooltip
          tooltip="Keyboard shortcuts"
          shortcut="?"
          placement="left"
          delay={500}
        >
          <Button onClick={this.handleOpenKeyboardShortcuts}>
            <KeyboardIcon />
          </Button>
        </Tooltip>
      </React.Fragment>
    );
  }
}

const Button = styled(NudeButton)`
  display: none;
  position: fixed;
  bottom: 0;
  right: 0;
  margin: 24px;

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default KeyboardShortcutsButton;
