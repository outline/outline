// @flow
import * as React from 'react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { lighten } from 'polished';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { KeyboardIcon } from 'outline-icons';
import Modal from 'components/Modal';
import Tooltip from 'components/Tooltip';
import KeyboardShortcuts from 'scenes/KeyboardShortcuts';

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

const Button = styled.button`
  display: none;
  position: fixed;
  bottom: 0;
  right: 0;
  margin: 24px;
  width: 24px;
  height: 24px;
  opacity: 0.8;
  background: none;
  border-radius: 4px;
  line-height: 0;
  border: 0;
  padding: 0;

  &:hover {
    opacity: 1;
  }

  &:focus {
    transition-duration: 0.05s;
    box-shadow: ${props => lighten(0.4, props.theme.buttonBackground)} 0px 0px
      0px 3px;
    outline: none;
  }

  ${breakpoint('tablet')`
    display: block;
  `};

  @media print {
    display: none;
  }
`;

export default KeyboardShortcutsButton;
