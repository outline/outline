// @flow
import React, { Component } from 'react';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import Portal from 'react-portal';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import PlusIcon from 'components/Icon/PlusIcon';
import type { State } from '../types';
import { splitAndInsertBlock } from '../transforms';

type Props = {
  state: State,
  onChange: Function,
  onInsertImage: File => Promise<*>,
};

@observer
export default class BlockInsert extends Component {
  props: Props;
  mouseMoveTimeout: number;

  @observable active: boolean = false;
  @observable menuOpen: boolean = false;
  @observable top: number;
  @observable left: number;
  @observable mouseX: number;

  componentDidMount = () => {
    this.update();
    window.addEventListener('mousemove', this.handleMouseMove);
  };

  componentWillUpdate = (nextProps: Props) => {
    this.update(nextProps);
  };

  componentWillUnmount = () => {
    window.removeEventListener('mousemove', this.handleMouseMove);
  };

  setInactive = () => {
    if (this.menuOpen) return;
    this.active = false;
  };

  handleMouseMove = (ev: SyntheticMouseEvent) => {
    const windowWidth = window.innerWidth / 3;
    let active = ev.clientX < windowWidth;

    if (active !== this.active) {
      this.active = active || this.menuOpen;
    }
    if (active) {
      clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(this.setInactive, 2000);
    }
  };

  handleMenuOpen = () => {
    this.menuOpen = true;
  };

  handleMenuClose = () => {
    this.menuOpen = false;
  };

  update = (props?: Props) => {
    if (!document.activeElement) return;
    const { state } = props || this.props;
    const boxRect = document.activeElement.getBoundingClientRect();
    const selection = window.getSelection();
    if (!selection.focusNode) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.top <= 0 || boxRect.left <= 0) return;

    if (state.startBlock.type === 'heading1') {
      this.active = false;
    }

    this.top = Math.round(rect.top + window.scrollY);
    this.left = Math.round(boxRect.left + window.scrollX - 20);
  };

  handleClick = () => {
    const transform = splitAndInsertBlock(this.props.state, {
      type: { type: 'block-toolbar', isVoid: true },
    });
    const state = transform.apply();
    this.props.onChange(state);
    this.active = false;
  };

  render() {
    const style = { top: `${this.top}px`, left: `${this.left}px` };

    return (
      <Portal isOpened>
        <Trigger active={this.active} style={style}>
          <PlusIcon onClick={this.handleClick} />
        </Trigger>
      </Portal>
    );
  }
}

const Trigger = styled.div`
  position: absolute;
  z-index: 1;
  opacity: 0;
  background-color: ${color.white};
  transition: opacity 250ms ease-in-out, transform 250ms ease-in-out;
  line-height: 0;
  margin-top: -3px;
  margin-left: -10px;
  box-shadow: inset 0 0 0 2px ${color.slateDark};
  border-radius: 100%;
  transform: scale(.9);

  &:hover {
    background-color: ${color.smokeDark};
  }

  ${({ active }) => active && `
    transform: scale(1);
    opacity: .9;
  `}
`;
