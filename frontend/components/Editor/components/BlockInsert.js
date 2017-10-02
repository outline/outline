// @flow
import React, { Component } from 'react';
import Portal from 'react-portal';
import styled from 'styled-components';
import Icon from 'components/Icon';
import _ from 'lodash';
import type { State } from '../types';

export default class BlockInsert extends Component {
  props: {
    state: State,
    onChange: Function,
  };

  menu: HTMLElement;
  state: {
    active: boolean,
    focused: boolean,
    top: string,
    left: string,
    mouseX: number,
  };

  state = {
    active: false,
    focused: false,
    top: '',
    left: '',
  };

  componentDidMount = () => {
    this.update();
    window.addEventListener('mousemove', this.handleMouseMove);
  };

  componentDidUpdate = () => {
    this.update();
  };

  componentWillUnmount = () => {
    window.removeEventListener('mousemove', this.handleMouseMove);
  };

  handleFocus = () => {
    this.setState({ focused: true });
  };

  handleBlur = () => {
    this.setState({ focused: false });
  };

  setInactive = () => {
    this.setState({ active: false });
  };

  handleMouseMove = (ev: SyntheticEvent) => {
    const windowHalfWidth = window.innerWidth / 2;
    const active = ev.clientX < windowHalfWidth;

    if (active !== this.state.active) {
      this.setState({ active });
    }
    if (active) {
      clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(this.setInactive, 2000);
    }
  };

  update = () => {
    if (!document.activeElement) return;

    const boxRect = document.activeElement.getBoundingClientRect();
    const selection = window.getSelection();
    if (!selection) return;

    const data = { ...this.state };
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.top === 0 && rect.left === 0) {
      this.setState(data);
      return;
    }

    data.top = `${Math.round(rect.top + window.scrollY)}px`;
    data.left = `${Math.round(boxRect.left + window.scrollX - 20)}px`;

    if (!_.isEqual(data, this.state)) {
      this.setState(data);
    }
  };

  setRef = (ref: HTMLElement) => {
    this.menu = ref;
  };

  render() {
    const style = {
      top: this.state.top,
      left: this.state.left,
    };

    return (
      <Portal isOpened>
        <Menu active={this.state.active} innerRef={this.setRef} style={style}>
          <Icon type="PlusCircle" />
        </Menu>
      </Portal>
    );
  }
}

const Menu = styled.div`
  position: absolute;
  z-index: 1;
  opacity: 0;
  background-color: #fff;
  border-radius: 4px;
  transition: opacity 250ms ease-in-out, transform 250ms ease-in-out;
  line-height: 0;
  height: 16px;
  width: 16px;
  transform: scale(.9);

  ${({ active }) => active && `
    transform: scale(1);
    opacity: 1;
  `}
`;
